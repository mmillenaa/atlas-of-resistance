ui_network <- function() {
  fluidPage(
    h3("Knowledge graph", style = "font-family: 'Merriweather', serif; color: #424242; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 25px;"),
    div(class = "painel-filtros",
        fluidRow(
          column(4, radioButtons("tipo_busca", "Exploration mode:", choices = c("General overview", "Filter by individual", "Filter by institution/movement"))),
          column(4, uiOutput("seletor_dinamico")),
          column(4, uiOutput("seletor_relacao"))
        )
    ),
    div(style = "position: relative; border: 1px solid #e0e0e0; border-radius: 4px; background-color: #fff;",
        visNetworkOutput("rede_interativa", height = "700px"),
        uiOutput("painel_biografia_flutuante")
    )
  )
}