ui_cosmov <- function() {
  fluidPage(
    h3(
      img(src = "icons/stars.png", style = "height: 32px; margin-right: 12px; vertical-align: middle; margin-bottom: 6px;"),
      "Corpora of Social Movements (Cosmov)", 
      style = "font-family: 'Merriweather', serif; color: #424242; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 25px;"
    ),
    p("Automated bibliographic research via the OpenAlex API. Explore academic papers, theses, and articles that mention the social movements catalogued in the Atlas.", style="line-height: 1.8; font-size: 1.05em; margin-bottom: 25px;"),
    
    fluidRow(
      column(8,
             textInput("cosmov_search", "Search term:", 
                       value = "Oposição Sindical Metalúrgica de São Paulo", width = "100%")
      ),
      column(4,
             tags$br(),
             actionButton("btn_search_cosmov", "Search Publications", 
                          class = "btn btn-primary", 
                          style = "background-color: #9D2235; border: none; font-weight: bold; width: 100%;")
      )
    ),
    
    hr(),
    
    div(style = "background-color: #ffffff; padding: 15px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);",
        DTOutput("cosmov_results")
    )
  )
}