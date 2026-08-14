# ============================================================
# SERVER ASSISTANT - FUSEKI SPARQL CONNECTION (NO DEADENDS)
# ============================================================
library(httr)
library(jsonlite)
library(DT)

server_assistant <- function(input, output, session) {
  
  # --- FUSEKI ENDPOINT CORRIGIDO ---
  # Ajustado de /ds/query para /atlas/query com base no log do Fuseki
  fuseki_endpoint <- "http://localhost:3030/atlas/query" 
  
  # ----- Render Icons -----
  get_icon <- function(type) {
    if (is.null(type) || type == "") return(NULL)
    switch(type,
           "Person" = "icons/Pessoas.png",
           "Document" = "icons/Documentos.png",
           "Institution" = "icons/Instituicoes.png",
           "Movement" = "icons/Movimentos.png",
           "Event" = "icons/Eventos.png",
           "Location" = "icons/Locais.png",
           "Concept" = "icons/Conceitos.png",
           "NormativeCategory" = "icons/Conceitos.png",
           NULL)
  }
  
  output$icon_subject <- renderUI({ 
    icon_path <- get_icon(input$query_subject_type)
    if(!is.null(icon_path)) img(src = icon_path, height = "35px") else div(style = "width: 35px;") 
  })
  
  output$icon_object <- renderUI({ 
    icon_path <- get_icon(input$query_object_type)
    if(!is.null(icon_path)) img(src = icon_path, height = "35px") else div(style = "width: 35px;") 
  })
  
  # ----- CASCADE STEP 1: Subject -> Predicate (Dinâmico via Fuseki) -----
  observeEvent(input$query_subject_type, {
    req(input$query_subject_type)
    
    subj <- input$query_subject_type
    
    # Exibe estado de carregamento enquanto o Fuseki é consultado
    updateSelectizeInput(session, "query_relation", choices = c("Consultando base de dados..." = ""))
    updateSelectizeInput(session, "query_object_type", choices = c("Aguardando predicado..." = ""))
    
    # Query para encontrar os predicados (relações) que realmente existem para este Sujeito
    query_string <- paste0(
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n",
      "PREFIX ex: <http://example.org/atlas/> \n",
      "SELECT DISTINCT ?Predicate \n",
      "WHERE { \n",
      "  ?s rdf:type ex:", subj, " . \n",
      "  ?s ?p ?o . \n",
      "  FILTER(?p != rdf:type) \n", 
      "  BIND(REPLACE(STR(?p), '^.*[/|#]', '') AS ?Predicate) \n",
      "}"
    )
    
    tryCatch({
      res <- POST(fuseki_endpoint,
                  add_headers(Accept = "application/sparql-results+json"),
                  body = list(query = query_string),
                  encode = "form")
      
      if (status_code(res) == 200) {
        data <- fromJSON(content(res, "text", encoding = "UTF-8"))
        if (length(data$results$bindings) > 0 && nrow(as.data.frame(data$results$bindings)) > 0) {
          valid_predicates <- data$results$bindings$Predicate$value
          updateSelectizeInput(session, "query_relation", 
                               choices = c("Select Predicate..." = "", valid_predicates))
        } else {
          updateSelectizeInput(session, "query_relation", 
                               choices = c("No predicates in database" = ""))
        }
      }
    }, error = function(e) {
      updateSelectizeInput(session, "query_relation", choices = c("Fuseki connection error" = ""))
    })
  })
  
  # ----- CASCADE STEP 2: Predicate -> Object (Dinâmico via Fuseki) -----
  observeEvent(input$query_relation, {
    req(input$query_subject_type, input$query_relation)
    
    subj <- input$query_subject_type
    pred <- input$query_relation
    
    updateSelectizeInput(session, "query_object_type", choices = c("Consultando base de dados..." = ""))
    
    # Query para encontrar os tipos de objetos válidos para a combinação Sujeito + Predicado
    query_string <- paste0(
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n",
      "PREFIX ex: <http://example.org/atlas/> \n",
      "SELECT DISTINCT ?ObjectType \n",
      "WHERE { \n",
      "  ?s rdf:type ex:", subj, " . \n",
      "  ?s ex:", pred, " ?o . \n",
      "  ?o rdf:type ?typeURI . \n",
      "  BIND(REPLACE(STR(?typeURI), '^.*[/|#]', '') AS ?ObjectType) \n",
      "}"
    )
    
    tryCatch({
      res <- POST(fuseki_endpoint,
                  add_headers(Accept = "application/sparql-results+json"),
                  body = list(query = query_string),
                  encode = "form")
      
      if (status_code(res) == 200) {
        data <- fromJSON(content(res, "text", encoding = "UTF-8"))
        if (length(data$results$bindings) > 0 && nrow(as.data.frame(data$results$bindings)) > 0) {
          valid_objects <- data$results$bindings$ObjectType$value
          updateSelectizeInput(session, "query_object_type", 
                               choices = c("Select Target..." = "", valid_objects))
        } else {
          updateSelectizeInput(session, "query_object_type", 
                               choices = c("No valid targets in database" = ""))
        }
      }
    }, error = function(e) {
      updateSelectizeInput(session, "query_object_type", choices = c("Fuseki connection error" = ""))
    })
  })
  
  # ----- Execute SPARQL Query -----
  observeEvent(input$run_sparql, {
    
    # 1. Check for custom query
    if (!is.null(input$custom_sparql) && trimws(input$custom_sparql) != "") {
      query_string <- input$custom_sparql
    } else {
      # 2. Build query from semantic builder
      subj <- input$query_subject_type
      pred <- input$query_relation
      obj <- input$query_object_type
      
      if (is.null(subj) || subj == "" || is.null(obj) || obj == "" || is.null(pred) || pred == "") {
        output$sparql_results <- renderDT({ datatable(data.frame(Message = "Please select Subject, Predicate, and Object.")) })
        return()
      }
      
      # Using the exact prefix discovered in the Fuseki tests
      query_string <- paste0(
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n",
        "PREFIX ex: <http://example.org/atlas/> \n",
        "SELECT ?Subject ?Predicate ?Object \n",
        "WHERE { \n",
        "  ?s rdf:type ex:", subj, " . \n",
        "  ?o rdf:type ex:", obj, " . \n",
        "  ?s ex:", pred, " ?o . \n",
        "  # Clean the URIs to show only the readable part \n",
        "  BIND(REPLACE(STR(?s), '^.*[/|#]', '') AS ?Subject) \n",
        "  BIND('", pred, "' AS ?Predicate) \n",
        "  BIND(REPLACE(STR(?o), '^.*[/|#]', '') AS ?Object) \n",
        "} \n",
        "LIMIT 100"
      )
    }
    
    # ----- Send to Fuseki -----
    tryCatch({
      res <- POST(fuseki_endpoint,
                  add_headers(Accept = "application/sparql-results+json"),
                  body = list(query = query_string),
                  encode = "form")
      
      if (status_code(res) == 200) {
        data <- fromJSON(content(res, "text", encoding = "UTF-8"))
        
        if (length(data$results$bindings) > 0 && nrow(as.data.frame(data$results$bindings)) > 0) {
          df <- as.data.frame(lapply(data$results$bindings, function(x) x$value))
          output$sparql_results <- renderDT({
            datatable(df, options = list(pageLength = 20, scrollX = TRUE), rownames = FALSE)
          })
        } else {
          output$sparql_results <- renderDT({ 
            datatable(data.frame(Message = "Query executed successfully, but returned 0 results.")) 
          })
        }
        
      } else {
        output$sparql_results <- renderDT({ 
          datatable(data.frame(Message = paste("Fuseki Error. Code:", status_code(res)))) 
        })
      }
      
    }, error = function(e) {
      output$sparql_results <- renderDT({ 
        datatable(data.frame(Message = paste("Failed to connect to Fuseki:", e$message))) 
      })
    })
  })
}