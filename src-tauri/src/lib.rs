use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

/// Estado para armazenar a atualização pendente (para o comando do frontend).
struct PendingUpdate(Arc<Mutex<Option<tauri_plugin_updater::Update>>>);

#[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
fn setup_updater(app: &tauri::App) -> Result<(), String> {
  let handle = app.handle().clone();
  let state = app.state::<PendingUpdate>().inner().0.clone();

  tauri::async_runtime::spawn(async move {
    let Ok(builder) = handle.updater_builder().build() else {
      return;
    };
    let Ok(Some(update)) = builder.check().await else {
      return;
    };

    let version = update.version.clone();
    let body = update.body.clone().unwrap_or_default().replace('<', "&lt;").replace('>', "&gt;").replace('\n', "<br>");

    if let Ok(mut guard) = state.lock() {
      *guard = Some(update);
    }

    let html = format!(
      r#"<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Atualização</title>
<style>body{{font-family:system-ui;padding:2rem;max-width:400px;margin:0 auto;text-align:center}}
h2{{color:#0f766e}}button{{background:#0f766e;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:1rem}}
button:hover{{background:#0d5c56}}button:disabled{{opacity:.6;cursor:not-allowed}}.notes{{font-size:.9rem;color:#666;margin:1rem 0}}</style></head>
<body><h2>Nova versão disponível</h2><p>Versão <strong>{}</strong></p><div class="notes">{}</div>
<button id="btn">Atualizar agora</button><p id="status"></p>
<script>
document.getElementById("btn").onclick=async function(){{
  this.disabled=true; document.getElementById("status").textContent="Baixando e instalando...";
  try {{
    await window.__TAURI__.core.invoke("perform_update");
    document.getElementById("status").textContent="Atualização instalada. Reiniciando...";
  }} catch(e) {{
    document.getElementById("status").textContent="Erro: "+e; this.disabled=false;
  }}
}};</script></body></html>"#,
      version, body
    );
    let data_url = format!("data:text/html;charset=utf-8,{}", urlencoding::encode(&html));

    let url = data_url.parse().unwrap_or_else(|_| "data:text/html,<p>Erro</p>".parse().unwrap());
    if let Err(e) = tauri::WebviewWindowBuilder::new(&handle, "updater", tauri::WebviewUrl::External(url))
      .title("Vestra - Atualização")
      .inner_size(420.0, 320.0)
      .resizable(false)
      .build()
    {
      log::error!("updater: could not open update window: {}", e);
    }
  });

  Ok(())
}

#[tauri::command]
async fn perform_update(state: tauri::State<'_, PendingUpdate>) -> Result<(), String> {
  let update = {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.take().ok_or("Nenhuma atualização pendente")?
  };

  update
    .download_and_install(|_, _| {}, || {})
    .await
    .map_err(|e| e.to_string())?;

  std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default();

  #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
  {
    builder = builder
      .plugin(tauri_plugin_updater::Builder::new().build())
      .plugin(tauri_plugin_process::init())
      .manage(PendingUpdate(Arc::new(Mutex::new(None))))
      .invoke_handler(tauri::generate_handler![perform_update]);
  }

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
      let _ = setup_updater(app);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
