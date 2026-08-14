ui_legal <- function() {
  fluidPage(
    h3("Legal concepts", style = "font-family: 'Merriweather', serif; color: #424242; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 25px;"),
    p("Glossary of legal categories, rights violations, and crimes mobilised within the historical dataset.", style = "color: #666; font-style: italic; margin-bottom: 25px; font-size: 1.1em;"),
    fluidRow(
      column(4,
             div(class = "painel-lateral", style = "height: auto; min-height: 400px;",
                 h4("Select a Concept", style = "font-family: 'Merriweather', serif; color: #9D2235; margin-top: 0;"),
                 uiOutput("seletor_compendio"),
                 hr(),
                 uiOutput("detalhe_compendio")
             )
      ),
      column(8, 
             tabsetPanel(
               tabPanel("Linked Events", style = "padding-top: 15px;", DTOutput("tabela_compendio")),
               tabPanel("Historical Trends", style = "padding-top: 15px;", plotOutput("grafico_compendio", height = "500px"))
             )
      )
    )
  )
}