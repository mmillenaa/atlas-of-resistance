library(httr)
library(jsonlite)
library(DT)
library(dplyr)

server_cosmov <- function(input, output, session) {
  
  observeEvent(input$btn_search_cosmov, {
    req(input$cosmov_search)
    
    # Renderiza uma mensagem de "carregando" enquanto a API responde
    output$cosmov_results <- renderDT({
      datatable(data.frame(Status = "Querying the OpenAlex global database... Please wait."))
    })
    
    # Força a busca por frase exata adicionando aspas duplas ao redor do termo
    exact_phrase <- paste0('"', input$cosmov_search, '"')
    search_term <- URLencode(exact_phrase)
    
    # Constrói a URL da API do OpenAlex
    openalex_url <- paste0("https://api.openalex.org/works?search=", search_term, "&per-page=50")
    
    tryCatch({
      # Chamada GET para a API
      res <- GET(openalex_url)
      
      if (status_code(res) == 200) {
        data <- fromJSON(content(res, "text", encoding = "UTF-8"))
        
        # Verifica se retornou resultados
        if (!is.null(data$results) && length(data$results) > 0) {
          
          # Extrai e limpa os dados relevantes com os nomes das colunas em inglês
          df_works <- data.frame(
            Year = data$results$publication_year,
            Title = data$results$title,
            Type = data$results$type,
            OpenAccess = data$results$open_access$is_oa,
            URL = ifelse(!is.na(data$results$doi), data$results$doi, data$results$id),
            stringsAsFactors = FALSE
          )
          
          # Transforma a URL em um link clicável
          df_works$URL <- paste0("<a href='", df_works$URL, "' target='_blank'>Access Document</a>")
          
          # Renderiza a tabela
          output$cosmov_results <- renderDT({
            datatable(df_works, 
                      escape = FALSE, # Permite renderizar o HTML do link
                      options = list(pageLength = 10, scrollX = TRUE), 
                      rownames = FALSE)
          })
          
        } else {
          output$cosmov_results <- renderDT({
            datatable(data.frame(Message = "No academic work found matching this exact phrase."))
          })
        }
      } else {
        output$cosmov_results <- renderDT({
          datatable(data.frame(Error = paste("OpenAlex API Error. Code:", status_code(res))))
        })
      }
    }, error = function(e) {
      output$cosmov_results <- renderDT({
        datatable(data.frame(Error = paste("Connection failed:", e$message)))
      })
    })
  })
}