# server_legal.R

# ---- Concept selector ----
output$seletor_compendio <- renderUI({
  req(nrow(df_concepts) > 0)
  cols <- names(df_concepts)
  nome_conceitos <- if("Label_EN" %in% cols) df_concepts$Label_EN else if("ConceptName_EN" %in% cols) df_concepts$ConceptName_EN else if(length(cols) > 0) df_concepts[[1]] else c()
  selectInput("conceito_escolhido", "Normative category / crime:", choices = sort(na.omit(unique(nome_conceitos))), width = "100%")
})

# ---- Concept details panel ----
output$detalhe_compendio <- renderUI({
  req(input$conceito_escolhido)
  cols <- names(df_concepts)
  if("Label_EN" %in% cols) { conc <- df_concepts %>% filter(Label_EN == input$conceito_escolhido) } else if("ConceptName_EN" %in% cols) { conc <- df_concepts %>% filter(ConceptName_EN == input$conceito_escolhido) } else { conc <- df_concepts %>% filter(df_concepts[[1]] == input$conceito_escolhido) }
  req(nrow(conc) > 0)
  
  c_type <- if("ConceptType" %in% cols && !is.na(conc$ConceptType[1])) conc$ConceptType[1] else "-"
  c_nature <- if("ConceptNature" %in% cols && !is.na(conc$ConceptNature[1])) conc$ConceptNature[1] else "-"
  h_leg <- if("HistoricalLegalStatus" %in% cols && !is.na(conc$HistoricalLegalStatus[1])) conc$HistoricalLegalStatus[1] else "-"
  h_prac <- if("HistoricalPracticalStatus" %in% cols && !is.na(conc$HistoricalPracticalStatus[1])) conc$HistoricalPracticalStatus[1] else "-"
  h_anch <- if("HistoricalAnchor" %in% cols && !is.na(conc$HistoricalAnchor[1])) conc$HistoricalAnchor[1] else "-"
  c_anch <- if("CurrentAnchor" %in% cols && !is.na(conc$CurrentAnchor[1])) conc$CurrentAnchor[1] else "-"
  a_note <- if("AnalyticalNote" %in% cols && !is.na(conc$AnalyticalNote[1])) conc$AnalyticalNote[1] else "-"
  
  HTML(paste0(
    "<div style='font-family: Roboto; font-size: 13.5px; color: #444; line-height: 1.5;'>",
    "<p><b>Type:</b> <span style='color: #9D2235;'>", c_type, "</span><br>",
    "<b>Nature:</b> ", c_nature, "</p>",
    "<p><b>Legal Status (1964):</b> ", h_leg, "<br>",
    "<b>Practical Status:</b> ", h_prac, "</p>",
    "<p><b>Historical Anchor:</b> ", h_anch, "<br>",
    "<b>Current Anchor:</b> ", c_anch, "</p>",
    "<hr style='margin: 15px 0;'>",
    "<div style='background: #f9f9f9; padding: 12px; border-left: 3px solid #9D2235; text-align: justify;'>",
    "<b style='color:#333;'>Analytical Note:</b><br>", a_note,
    "</div></div>"
  ))
})

# ---- Table of linked events ----
output$tabela_compendio <- renderDT({
  req(input$conceito_escolhido)
  
  opcoes_tabela <- list(
    pageLength = 12, 
    dom = 'Btp',
    language = list(emptyTable = "Data mapping for this normative category is currently in progress.")
  )
  
  tabela_vazia <- data.frame(Person=character(), Legal_Relation=character(), EventType=character(), Document=character(), StartDate=character(), EndDate=character())
  if(nrow(df_event_concepts) == 0) return(datatable(tabela_vazia, options = opcoes_tabela, rownames = FALSE, selection = 'none'))
  
  cols <- names(df_concepts)
  if("Label_EN" %in% cols) { conc_id <- df_concepts %>% filter(Label_EN == input$conceito_escolhido) %>% pull(ConceptID) } else { conc_id <- df_concepts %>% filter(df_concepts[[1]] == input$conceito_escolhido) %>% pull(1) }
  
  if(length(conc_id) == 0) return(datatable(tabela_vazia, options = opcoes_tabela, rownames = FALSE, selection = 'none'))
  
  tabela_res <- df_event_concepts %>% filter(ConceptID == conc_id[1])
  if(nrow(tabela_res) == 0) return(datatable(tabela_vazia, options = opcoes_tabela, rownames = FALSE, selection = 'none'))
  
  if(nrow(df_events) > 0 && "EventID" %in% names(df_events)) {
    tabela_res <- tabela_res %>% left_join(df_events %>% select(any_of(c("EventID", "EventType", "StartDate", "EndDate"))), by = "EventID")
  }
  
  if(nrow(df_event_persons) > 0 && "EventID" %in% names(df_event_persons) && nrow(df_persons) > 0) {
    if("Role" %in% names(df_event_persons)) {
      pessoas_ev <- df_event_persons %>% left_join(df_persons %>% select(any_of(c("PersonID", "Name"))), by = "PersonID")
      browse_role <- pessoas_ev$Role
      pessoas_ev$Legal_Relation <- sapply(browse_role, function(r) {
        if(!is.na(r) && trimws(r) != "") paste0(toupper(substr(trimws(r), 1, 1)), substr(str_replace_all(trimws(r), "_", " "), 2, nchar(trimws(r)))) else "Involved"
      })
    } else {
      pessoas_ev <- df_event_persons %>% left_join(df_persons %>% select(any_of(c("PersonID", "Name"))), by = "PersonID")
      pessoas_ev$Legal_Relation <- "Involved"
    }
    
    if("DocumentID" %in% names(df_document_persons) && nrow(df_documents) > 0) {
      docs_joined <- left_join(df_document_persons, df_documents, by = "DocumentID")
      docs_joined$DocLink <- sapply(1:nrow(docs_joined), function(j) {
        repo_name <- if("Repository" %in% names(docs_joined) && !is.na(docs_joined$Repository[j]) && trimws(docs_joined$Repository[j]) != "") docs_joined$Repository[j] else docs_joined$DocumentID[j]
        url_col <- if("SourceURL" %in% names(docs_joined)) "SourceURL" else if("URL" %in% names(docs_joined)) "URL" else NULL
        url_val <- if(!is.null(url_col) && !is.na(docs_joined[[url_col]][j]) && trimws(docs_joined[[url_col]][j]) != "") trimws(docs_joined[[url_col]][j]) else ""
        
        if(url_val != "") {
          paste0("<a href='", url_val, "' target='_blank' style='color:#9D2235;'>", repo_name, "</a>")
        } else {
          repo_name
        }
      })
      
      doc_map <- docs_joined %>% 
        group_by(PersonID) %>% 
        summarise(Document = paste(unique(na.omit(DocLink)), collapse = " | "), .groups = "drop") %>%
        as.data.frame()
      pessoas_ev <- left_join(pessoas_ev, doc_map, by = "PersonID")
    } else {
      pessoas_ev$Document <- "-"
    }
    
    pessoas_ev <- pessoas_ev %>% select(any_of(c("EventID", "Name", "Legal_Relation", "Document")))
    names(pessoas_ev)[names(pessoas_ev) == "Name"] <- "Person"
    tabela_res <- left_join(tabela_res, pessoas_ev, by = "EventID", relationship = "many-to-many")
  } else {
    tabela_res$Person <- "Mapping in progress"
    tabela_res$Legal_Relation <- "-"
    tabela_res$Document <- "-"
  }
  
  cols_to_keep <- intersect(c("Person", "Legal_Relation", "EventType", "Document", "StartDate", "EndDate"), names(tabela_res))
  tabela_res <- tabela_res[, cols_to_keep, drop = FALSE]
  
  tabela_limpa <- data.frame(matrix(ncol = ncol(tabela_res), nrow = nrow(tabela_res)), stringsAsFactors = FALSE)
  colnames(tabela_limpa) <- colnames(tabela_res)
  
  for(col in colnames(tabela_res)) {
    tabela_limpa[[col]] <- unlist(lapply(tabela_res[[col]], function(x) {
      if(is.null(x) || length(x) == 0 || is.na(x)) return("-")
      as.character(x[1])
    }))
  }
  
  tabela_limpa <- tabela_limpa %>%
    group_by(Person, Legal_Relation, EventType) %>%
    summarise(
      Document = {
        docs <- unlist(strsplit(paste(Document, collapse = " | "), " \\| "))
        docs <- unique(trimws(docs[docs != "-" & docs != ""]))
        if(length(docs) > 0) paste(docs, collapse = " | ") else "-"
      },
      StartDate = {
        dts <- unlist(strsplit(paste(StartDate, collapse = ", "), ", "))
        dts <- unique(trimws(dts[dts != "-" & dts != ""]))
        if(length(dts) > 0) paste(dts, collapse = ", ") else "-"
      },
      EndDate = {
        dte <- unlist(strsplit(paste(EndDate, collapse = ", "), ", "))
        dte <- unique(trimws(dte[dte != "-" & dte != ""]))
        if(length(dte) > 0) paste(dte, collapse = ", ") else "-"
      },
      .groups = "drop"
    ) %>% as.data.frame()
  
  datatable(tabela_limpa, options = opcoes_tabela, rownames = FALSE, selection = 'none', escape = FALSE)
})

# ---- Historical trends plot ----
output$grafico_compendio <- renderPlot({
  req(input$conceito_escolhido)
  
  grafico_vazio <- ggplot() + 
    annotate("text", x = 1, y = 1, label = "No chronological data available for this category.", fontface = "italic", size = 5, color = "#777") + 
    theme_void()
  
  if(nrow(df_event_concepts) == 0 || nrow(df_events) == 0) return(grafico_vazio)
  
  cols <- names(df_concepts)
  if("Label_EN" %in% cols) { 
    conc_id <- df_concepts %>% filter(Label_EN == input$conceito_escolhido) %>% pull(ConceptID) 
  } else { 
    conc_id <- df_concepts %>% filter(df_concepts[[1]] == input$conceito_escolhido) %>% pull(1) 
  }
  
  if(length(conc_id) == 0) return(grafico_vazio)
  
  ev_ids <- df_event_concepts %>% filter(ConceptID == conc_id[1]) %>% pull(EventID)
  if(length(ev_ids) == 0) return(grafico_vazio)
  
  dados_grafico <- df_events %>% 
    filter(EventID %in% ev_ids) %>%
    mutate(Year = as.numeric(str_extract(StartDate, "\\d{4}"))) %>%
    filter(!is.na(Year))
  
  if(nrow(dados_grafico) == 0) return(grafico_vazio)
  
  dados_agg <- dados_grafico %>% 
    group_by(Year) %>% 
    summarise(Count = n(), .groups = "drop")
  
  espectro_anos <- data.frame(Year = 1964:1988)
  dados_agg <- left_join(espectro_anos, dados_agg, by = "Year")
  dados_agg$Count[is.na(dados_agg$Count)] <- 0
  
  ggplot(dados_agg, aes(x = Year, y = Count)) +
    geom_col(fill = "#9D2235", width = 0.75, color = "#7a1a29") +
    geom_line(aes(y = Count), color = "#424242", size = 0.7, group = 1, alpha = 0.4) +
    scale_x_continuous(breaks = seq(1964, 1988, by = 2)) +
    labs(
      title = paste("Historical Frequency Analysis:", input$conceito_escolhido),
      x = "Year of Occurrence",
      y = "Documented Incidents (Count)"
    ) +
    theme_minimal(base_family = "Roboto") +
    theme(
      plot.title = element_text(family = "Merriweather", face = "bold", size = 13, color = "#9D2235", margin = margin(b=15)),
      axis.title = element_text(size = 11, color = "#424242"),
      panel.grid.minor = element_blank(),
      panel.grid.major.x = element_blank()
    )
})