ui_geography <- function() {
  fluidPage(
    h3("Memory and resistance sites", style = "font-family: 'Merriweather', serif; color: #424242; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 25px;"),
    fluidRow(
      column(8, 
             p("Map plotting the locations of resistance and state repression based on historical coordinates.", style = "color: #666; font-style: italic; margin-bottom: 15px; font-size: 1.1em;"),
             fluidRow(
               column(4, style = "margin-top: 6px;", checkboxInput("mostrar_heatmap", "Enable Heatmap Layer (Event Density)", value = FALSE)),
               column(8, uiOutput("seletor_mapa_conceito"))
             ),
             leafletOutput("mapa_locais", height = "600px")
      ),
      column(4, style = "margin-top: 50px;", uiOutput("painel_detalhes_mapa"))
    )
  )
}