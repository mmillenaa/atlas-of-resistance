source("ui_about.R", local = TRUE)
source("ui_network.R", local = TRUE)
source("ui_geography.R", local = TRUE)
source("ui_legal.R", local = TRUE)
source("ui_assistant.R", local = TRUE)
source("ui_data.R", local = TRUE)
source("ui_cosmov.R", local = TRUE)

ui <- fluidPage(
  title = "Atlas of Resistance - 1964",
  theme = tema_max_planck,
  header = tags$head(
    tags$style(HTML("
      .container-fluid { padding-left: 0; padding-right: 0; }
      .nav-tabs { background-color: #9D2235; border-bottom: none; display: flex !important; flex-wrap: nowrap; padding: 0 50px; }
      .nav-tabs > li { float: none; margin-bottom: 0; }
      .nav-tabs > li > a { color: #ffffff !important; border: none !important; border-radius: 0; padding: 15px 25px; font-size: 1.1em; font-family: 'Roboto', sans-serif; }
      .nav-tabs > li.active > a, .nav-tabs > li > a:hover { background-color: #7a1a29 !important; color: #ffffff !important; }
      .tab-content { padding: 40px 60px 40px 60px; background-color: #fafafa; min-height: 800px; }
      .tab-pane { padding-top: 10px; }
      .painel-filtros { background-color: #ffffff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      .painel-lateral { background-color: #ffffff; padding: 25px; border: 1px solid #e0e0e0; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.08); height: 600px; overflow-y: auto; }
      .destaque-evidencia { background-color: #fff9e6; font-weight: bold; border-left: 3px solid #9D2235; }
    "))
  ),
  cabecalho_customizado,
  tabsetPanel(
    tabPanel("About the project", ui_about()),
    tabPanel("Network explorer", ui_network()),
    tabPanel("Geographical contextualisation", ui_geography()),
    tabPanel("Legal compendium", ui_legal()),
    tabPanel("Semantic Assistant", ui_assistant()),
    tabPanel("Data repository", ui_data()),
    tabPanel(HTML("<img src='icons/stars.png' style='height: 18px; margin-right: 8px; vertical-align: middle; margin-bottom: 3px;'>Cosmov"), ui_cosmov())
  )
)