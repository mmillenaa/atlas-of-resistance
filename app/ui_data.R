ui_data <- function() {
  fluidPage(
    h3("Integrated raw data", style = "font-family: 'Merriweather', serif; color: #424242; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 25px;"),
    p("Browse the integrated raw data comprising individuals, institutions, and their historical linkages.", style = "color: #666; font-style: italic; margin-bottom: 25px; font-size: 1.1em;"),
    DTOutput("tabela_dados")
  )
}