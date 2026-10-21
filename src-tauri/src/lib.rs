//! Pawse: a little pet that lives along the bottom of your screen, keeps its own daily
//! rhythm and nudges you to take breaks. The pet lives in one transparent strip window
//! that lets clicks through everywhere except on the pet and its speech bubble.

mod idle;

use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindowBuilder, Wry};

/// Height of the strip the pet lives in, in logical pixels (room to jump and talk).
const STRIP: f64 = 300.0;

struct State {
    /// Rectangles (x, y, w, h in the strip's logical pixels) that should catch the mouse.
    hits: Mutex<Vec<[f64; 4]>>,
    monitor: AtomicUsize,
    shown: AtomicBool,
    last_move: Mutex<(Option<(f64, f64)>, Instant)>,
    shown_item: Mutex<Option<CheckMenuItem<Wry>>>,
}

#[derive(Serialize)]
struct Status {
    cursor: Option<(f64, f64)>,
    idle_ms: u64,
}

/// Is a point (logical pixels, relative to the strip) on any of the rectangles?
pub fn hit(rects: &[[f64; 4]], p: (f64, f64)) -> bool {
    rects.iter().any(|r| p.0 >= r[0] && p.0 <= r[0] + r[2] && p.1 >= r[1] && p.1 <= r[1] + r[3])
}

/// Converts a point in physical screen pixels to a window's own logical pixels.
pub fn to_local(p: (f64, f64), origin: (f64, f64), scale: f64) -> (f64, f64) {
    let s = if scale > 0.0 { scale } else { 1.0 };
    ((p.0 - origin.0) / s, (p.1 - origin.1) / s)
}

/// Where the strip goes on a monitor's work area (logical x, y, width, height).
pub fn strip_rect(area_pos: (i32, i32), area_size: (u32, u32), scale: f64) -> (f64, f64, f64, f64) {
    let s = if scale > 0.0 { scale } else { 1.0 };
    let (x, y) = (area_pos.0 as f64 / s, area_pos.1 as f64 / s);
    let (w, h) = (area_size.0 as f64 / s, area_size.1 as f64 / s);
    let sh = STRIP.min(h);
    (x, y + h - sh, w, sh)
}

fn cursor_local(app: &AppHandle) -> Option<(f64, f64)> {
    let win = app.get_webview_window("pet")?;
    let origin = win.outer_position().ok()?;
    let scale = win.scale_factor().unwrap_or(1.0);
    let c = app.cursor_position().ok()?;
    Some(to_local((c.x, c.y), (origin.x as f64, origin.y as f64), scale))
}

/// Idle time from the system, or failing that, from how long the mouse has been still.
fn idle_ms(app: &AppHandle) -> u64 {
    let mouse = app.state::<State>().last_move.lock().unwrap().1.elapsed().as_millis() as u64;
    match idle::idle_ms() {
        Some(sys) => sys.min(mouse),
        None => mouse,
    }
}

#[tauri::command]
fn status(app: AppHandle) -> Status {
    Status { cursor: cursor_local(&app), idle_ms: idle_ms(&app) }
}

#[tauri::command]
fn set_hits(app: AppHandle, rects: Vec<[f64; 4]>) {
    *app.state::<State>().hits.lock().unwrap() = rects;
}

fn place(app: &AppHandle) -> tauri::Result<()> {
    let monitors = app.available_monitors()?;
    if monitors.is_empty() {
        return Ok(());
    }
    let i = app.state::<State>().monitor.load(Ordering::SeqCst) % monitors.len();
    let m = &monitors[i];
    let area = m.work_area();
    let (x, y, w, h) = strip_rect((area.position.x, area.position.y), (area.size.width, area.size.height), m.scale_factor());
    let win = match app.get_webview_window("pet") {
        Some(w) => w,
        None => WebviewWindowBuilder::new(app, "pet", WebviewUrl::App("pet.html".into()))
            .title("Pawse")
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .shadow(false)
            .focused(false)
            .min_inner_size(2.0, 2.0)
            .visible(false)
            .visible_on_all_workspaces(true)
            .build()?,
    };
    win.set_size(LogicalSize::new(w, h))?;
    win.set_position(LogicalPosition::new(x, y))?;
    // Linux needs the window shown once before it can be made click-through.
    win.show()?;
    win.set_ignore_cursor_events(true)?;
    if !app.state::<State>().shown.load(Ordering::SeqCst) {
        win.hide()?;
    }
    let _ = app.emit("pawse://placed", (w, h));
    Ok(())
}

#[tauri::command]
fn next_screen(app: AppHandle) {
    app.state::<State>().monitor.fetch_add(1, Ordering::SeqCst);
    let _ = place(&app);
}

fn set_shown(app: &AppHandle, on: bool) {
    let state = app.state::<State>();
    state.shown.store(on, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("pet") {
        if on {
            let _ = win.show();
            let _ = win.set_ignore_cursor_events(true);
        } else {
            let _ = win.hide();
        }
    }
    let item = state.shown_item.lock().unwrap().clone();
    if let Some(item) = item {
        let _ = item.set_checked(on);
    }
}

#[tauri::command]
fn show_pet(app: AppHandle, on: bool) {
    set_shown(&app, on);
}

#[tauri::command]
fn open_settings(app: AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("settings.html".into()))
        .title("Pawse")
        .inner_size(760.0, 720.0)
        .min_inner_size(520.0, 520.0)
        .center()
        .build();
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

/// Makes the strip catch the mouse only over the pet and its bubble, and notes when
/// the mouse last moved.
fn watch_mouse(app: AppHandle) {
    std::thread::spawn(move || {
        let mut catching = false;
        loop {
            std::thread::sleep(Duration::from_millis(30));
            let state = app.state::<State>();
            let Ok(c) = app.cursor_position() else { continue };
            {
                let mut last = state.last_move.lock().unwrap();
                if last.0.map_or(true, |p| (p.0 - c.x).abs() > 0.5 || (p.1 - c.y).abs() > 0.5) {
                    *last = (Some((c.x, c.y)), Instant::now());
                }
            }
            if !state.shown.load(Ordering::SeqCst) {
                continue;
            }
            let Some(p) = cursor_local(&app) else { continue };
            let over = hit(&state.hits.lock().unwrap(), p);
            if over != catching {
                catching = over;
                if let Some(win) = app.get_webview_window("pet") {
                    let _ = win.set_ignore_cursor_events(!over);
                }
            }
        }
    });
}

pub fn run() {
    tauri::Builder::default()
        .manage(State {
            hits: Mutex::new(Vec::new()),
            monitor: AtomicUsize::new(0),
            shown: AtomicBool::new(true),
            last_move: Mutex::new((None, Instant::now())),
            shown_item: Mutex::new(None),
        })
        .plugin(tauri_plugin_single_instance::init(|app, _, _| open_settings(app.clone())))
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .invoke_handler(tauri::generate_handler![status, set_hits, next_screen, show_pet, open_settings, quit])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let handle = app.handle().clone();
            place(&handle)?;
            watch_mouse(handle.clone());

            let shown = CheckMenuItem::with_id(app, "shown", "Show pet", true, true, None::<&str>)?;
            let pet = MenuItem::with_id(app, "pet", "Pet", true, None::<&str>)?;
            let trick = MenuItem::with_id(app, "trick", "Do a trick", true, None::<&str>)?;
            let treat = MenuItem::with_id(app, "treat", "Give a treat", true, None::<&str>)?;
            let brk = MenuItem::with_id(app, "break", "Take a break now", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "No reminders for an hour", true, None::<&str>)?;
            let screen = MenuItem::with_id(app, "screen", "Move to the next screen", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Pawse", true, None::<&str>)?;
            let s1 = PredefinedMenuItem::separator(app)?;
            let s2 = PredefinedMenuItem::separator(app)?;
            let s3 = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&shown, &s1, &pet, &trick, &treat, &s2, &brk, &pause, &screen, &settings, &s3, &quit])?;
            *app.state::<State>().shown_item.lock().unwrap() = Some(shown);

            TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().expect("app icon"))
                .tooltip("Pawse")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "shown" => {
                        let on = !app.state::<State>().shown.load(Ordering::SeqCst);
                        set_shown(app, on);
                    }
                    "screen" => next_screen(app.clone()),
                    "settings" => open_settings(app.clone()),
                    "quit" => app.exit(0),
                    other => {
                        let _ = app.emit("pawse://tray", other.to_string());
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        set_shown(app, true);
                        let _ = app.emit("pawse://tray", "pet".to_string());
                    }
                })
                .build(app)?;

            set_shown(&handle, true);
            // The first launch also opens the settings, to name your pet.
            if let Ok(marker) = handle.path().app_config_dir().map(|d| d.join("launched")) {
                if !marker.exists() {
                    let _ = std::fs::create_dir_all(marker.parent().unwrap());
                    let _ = std::fs::write(&marker, b"1");
                    open_settings(handle);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Pawse");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_pet_catches_the_mouse() {
        let rects = [[100.0, 180.0, 170.0, 120.0], [80.0, 60.0, 260.0, 110.0]];
        assert!(hit(&rects, (150.0, 250.0)));
        assert!(hit(&rects, (300.0, 100.0)));
        assert!(!hit(&rects, (500.0, 250.0)));
        assert!(!hit(&[], (0.0, 0.0)));
    }

    #[test]
    fn the_strip_sits_on_the_bottom_of_the_work_area() {
        assert_eq!(strip_rect((0, 0), (1920, 1040), 1.0), (0.0, 740.0, 1920.0, 300.0));
        assert_eq!(strip_rect((3840, 0), (2560, 1400), 2.0), (1920.0, 400.0, 1280.0, 300.0));
        assert_eq!(strip_rect((0, 0), (800, 200), 1.0), (0.0, 0.0, 800.0, 200.0));
    }

    #[test]
    fn converts_points_to_window_coordinates() {
        assert_eq!(to_local((2120.0, 200.0), (1920.0, 0.0), 2.0), (100.0, 100.0));
    }
}
