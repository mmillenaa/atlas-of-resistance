# server_network.R

# ---- Dynamic selectors ----
output$seletor_dinamico <- renderUI({
  if (input$tipo_busca == "Filter by individual") { 
    selectInput("entidade_selecionada", "Select individual:", choices = sort(unique(edges$from)), width = "100%")
  } else if (input$tipo_busca == "Filter by institution/movement") { 
    selectInput("entidade_selecionada", "Select institution or movement:", choices = sort(unique(edges$to)), width = "100%")
  } else { NULL }
})

output$seletor_relacao <- renderUI({
  selectInput("filtro_tipo_relacao", "Filter relationship types:", choices = sort(unique(edges$label)), multiple = TRUE, width = "100%")
})

# ---- Node selection ----
no_selecionado <- reactiveVal(NULL)
observeEvent(input$nó_clicado, { 
  if(is.null(input$nó_clicado) || input$nó_clicado == "") no_selecionado(NULL) else no_selecionado(input$nó_clicado) 
})
observeEvent(c(input$tipo_busca, input$entidade_selecionada, input$filtro_tipo_relacao), { no_selecionado(NULL) })

# ---- Network rendering ----
output$rede_interativa <- renderVisNetwork({
  df_filtrado <- edges
  if (!is.null(input$filtro_tipo_relacao)) df_filtrado <- df_filtrado %>% filter(label %in% input$filtro_tipo_relacao)
  if (input$tipo_busca == "Filter by individual" && !is.null(input$entidade_selecionada)) 
    df_filtrado <- df_filtrado %>% filter(from == input$entidade_selecionada)
  else if (input$tipo_busca == "Filter by institution/movement" && !is.null(input$entidade_selecionada)) 
    df_filtrado <- df_filtrado %>% filter(to == input$entidade_selecionada)
  
  req(nrow(df_filtrado) > 0)
  
  pessoas <- unique(df_filtrado$from)
  instituicoes <- unique(df_filtrado$to)
  nodes <- data.frame(id = c(pessoas, instituicoes), 
                      label = c(pessoas, instituicoes), 
                      group = c(rep("Individual", length(pessoas)), rep("Institution", length(instituicoes))), 
                      stringsAsFactors = FALSE)
  
  if("ImageURL" %in% names(df_persons)) {
    nodes <- left_join(nodes, df_persons %>% select(Name, ImageURL), by = c("id" = "Name"))
    nodes$size <- 35
    nodes$shape <- ifelse(!is.na(nodes$ImageURL) & nodes$ImageURL != "", "circularImage", "dot")
    nodes$image <- ifelse(!is.na(nodes$ImageURL) & nodes$ImageURL != "", nodes$ImageURL, NA)
  } else { nodes$shape = "dot" }
  
  nodes$color.background <- ifelse(nodes$group == "Individual", "#9D2235", "#cccccc")
  nodes$color.border <- "#424242"
  nodes$font.face <- "Roboto"
  
  visNetwork(nodes, df_filtrado) %>%
    visEdges(smooth = list(enabled = TRUE, type = "continuous")) %>%
    visPhysics(solver = "forceAtlas2Based", forceAtlas2Based = list(gravitationalConstant = -90, springLength = 350, centralGravity = 0.005)) %>%
    visOptions(highlightNearest = list(enabled = TRUE, degree = 1, hover = TRUE)) %>%
    visNodes(shapeProperties = list(useBorderWithImage = TRUE)) %>%
    visEvents(selectNode = "function(properties) { Shiny.setInputValue('nó_clicado', properties.nodes[0], {priority: 'event'}); }",
              deselectNode = "function(properties) { Shiny.setInputValue('nó_clicado', '', {priority: 'event'}); }",
              click = "function(properties) { if(properties.nodes.length === 0) { Shiny.setInputValue('nó_clicado', '', {priority: 'event'}); } }") %>%
    visLayout(randomSeed = 42)
})

# ---- Biography panel ----
output$painel_biografia_flutuante <- renderUI({
  id_selec <- no_selecionado()
  if(is.null(id_selec) || id_selec == "") return(NULL)
  p_dados <- df_persons %>% filter(Name == id_selec)
  req(nrow(p_dados) > 0)
  
  bio_en <- if("Biography_EN" %in% names(p_dados) && !is.na(p_dados$Biography_EN[1]) && p_dados$Biography_EN[1] != "") 
    p_dados$Biography_EN[1] else "Biography pending integration."
  bio_pt <- if("Biography_ORIG" %in% names(p_dados) && !is.na(p_dados$Biography_ORIG[1]) && p_dados$Biography_ORIG[1] != "") 
    p_dados$Biography_ORIG[1] else "Biografia pendente de integração."
  
  img_html <- ""
  if("ImageURL" %in% names(p_dados) && !is.na(p_dados$ImageURL[1]) && p_dados$ImageURL[1] != "") {
    img_html <- paste0("<div style='text-align: center; margin-bottom: 15px;'><img src='", p_dados$ImageURL[1], "' style='width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid #9D2235; box-shadow: 0 2px 5px rgba(0,0,0,0.2);'></div>")
  }
  
  docs_html <- ""
  if(nrow(df_document_persons) > 0 && nrow(df_documents) > 0 && "PersonID" %in% names(p_dados)) {
    doc_ids <- df_document_persons %>% filter(PersonID == p_dados$PersonID[1]) %>% pull(DocumentID)
    if(length(doc_ids) > 0) {
      docs <- df_documents %>% filter(DocumentID %in% doc_ids)
      if(nrow(docs) > 0) {
        docs_formatados <- sapply(1:nrow(docs), function(i) {
          repo_name <- if("Repository" %in% names(docs) && !is.na(docs$Repository[i]) && trimws(docs$Repository[i]) != "") 
            docs$Repository[i] else docs$DocumentID[i]
          url_col <- if("SourceURL" %in% names(docs)) "SourceURL" else if("URL" %in% names(docs)) "URL" else NULL
          url_val <- if(!is.null(url_col) && !is.na(docs[[url_col]][i]) && trimws(docs[[url_col]][i]) != "") 
            trimws(docs[[url_col]][i]) else ""
          
          if(url_val != "") {
            paste0("<a href='", url_val, "' target='_blank' style='color: #9D2235; font-weight: bold; text-decoration: underline;'>", repo_name, "</a>")
          } else {
            repo_name
          }
        })
        docs_html <- paste0("<div style='font-size: 11px; color: #555; margin-top: 15px; line-height: 1.4; border-top: 1px dashed #ccc; padding-top: 10px;'><b>Archival Sources / Documents:</b><ul style='padding-left: 15px; margin-bottom: 0;'>", 
                            paste0("<li>", docs_formatados, "</li>", collapse = ""), 
                            "</ul></div>")
      }
    }
  }
  
  citacao_html <- gera_citacao(p_dados)
  
  botoes_lang <- "<div style='text-align: right; margin-bottom: 10px;'>
                    <button onclick=\"document.getElementById('bio-en').style.display='block'; document.getElementById('bio-pt').style.display='none';\" style='background-color: #9D2235; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;'>EN</button>
                    <button onclick=\"document.getElementById('bio-en').style.display='none'; document.getElementById('bio-pt').style.display='block';\" style='background-color: #eee; color: #333; border: 1px solid #ccc; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;'>PT</button>
                  </div>"
  
  HTML(paste0(
    "<div style='position: absolute; top: 15px; left: 15px; width: 360px; max-height: 65vh; overflow-y: auto; background-color: rgba(255,255,255,0.96); border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); padding: 20px; z-index: 1000;'>",
    botoes_lang, img_html,
    "<h4 style='font-family: Merriweather; color: #9D2235; text-align: center; margin-top: 0;'>", id_selec, "</h4>",
    "<div id='bio-en' style='display:block; font-family: Roboto; font-size: 13px; line-height: 1.6; color: #333; text-align: justify;'>", bio_en, "</div>",
    "<div id='bio-pt' style='display:none; font-family: Roboto; font-size: 13px; line-height: 1.6; color: #333; text-align: justify;'>", bio_pt, "</div>",
    docs_html, citacao_html,
    "</div>"
  ))
})