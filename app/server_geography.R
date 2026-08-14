# server_geography.R

# ---- Reactive data for map ----
dados_mapa_reativo <- reactive({
  req(nrow(df_locations) > 0)
  locs <- df_locations
  locs$ID_Unico <- paste0("loc_", 1:nrow(locs))
  locs$Latitude <- as.numeric(str_replace(locs$Latitude, ",", "."))
  locs$Longitude <- as.numeric(str_replace(locs$Longitude, ",", "."))
  locs <- locs %>% filter(!is.na(Latitude) & !is.na(Longitude))
  
  locs$PlaceID <- as.character(locs$PlaceID)
  events_filtrados <- df_events
  if (nrow(events_filtrados) > 0) events_filtrados$PlaceID <- as.character(events_filtrados$PlaceID)
  
  if (input$mostrar_heatmap && !is.null(input$mapa_conceito_id) && input$mapa_conceito_id != "ALL" && nrow(df_event_concepts) > 0 && nrow(df_concepts) > 0) {
    cols_c <- names(df_concepts)
    nome_col <- if("Label_EN" %in% cols_c) "Label_EN" else if("ConceptName_EN" %in% cols_c) "ConceptName_EN" else cols_c[1]
    
    target_concept_id <- df_concepts %>% 
      filter(.data[[nome_col]] == input$mapa_conceito_id) %>% 
      pull(ConceptID)
    
    if (length(target_concept_id) > 0) {
      valid_event_ids <- df_event_concepts %>% 
        filter(as.character(ConceptID) == as.character(target_concept_id[1])) %>% 
        pull(EventID)
      events_filtrados <- events_filtrados %>% filter(as.character(EventID) %in% as.character(valid_event_ids))
    }
  }
  
  ev_counts <- data.frame(PlaceID = character(), n_events = numeric())
  if (nrow(events_filtrados) > 0 && "PlaceID" %in% names(events_filtrados)) {
    ev_counts <- events_filtrados %>% group_by(PlaceID) %>% summarise(n_events = n(), .groups = "drop")
  }
  locs <- locs %>% left_join(ev_counts, by = "PlaceID")
  locs$n_events[is.na(locs$n_events)] <- 0
  
  ids_com_evento <- if("PlaceID" %in% names(events_filtrados)) unique(events_filtrados$PlaceID) else c()
  if ("Source_MDH" %in% names(locs)) { locs$eh_mdh <- toupper(trimws(as.character(locs$Source_MDH))) %in% c("TRUE", "1", "V", "VERDADEIRO") } else { locs$eh_mdh <- FALSE }
  locs$tem_evento <- locs$PlaceID %in% ids_com_evento
  locs$cor_marcador <- ifelse(locs$tem_evento | locs$eh_mdh, "#9D2235", "#808080")
  locs
})

# ---- Dynamic selector for map concepts (heatmap filter) ----
output$seletor_mapa_conceito <- renderUI({
  req(input$mostrar_heatmap)
  req(nrow(df_concepts) > 0)
  
  locais_validos <- as.character(df_locations$PlaceID)
  eventos_com_local <- df_events %>% 
    filter(as.character(PlaceID) %in% locais_validos) %>% 
    pull(EventID)
  
  conceitos_com_evento <- c()
  if (nrow(df_event_concepts) > 0) {
    conceitos_com_evento <- df_event_concepts %>% 
      filter(as.character(EventID) %in% as.character(eventos_com_local)) %>% 
      pull(ConceptID)
  }
  
  cols <- names(df_concepts)
  nome_col <- if("Label_EN" %in% cols) "Label_EN" else if("ConceptName_EN" %in% cols) "ConceptName_EN" else cols[1]
  
  df_concepts_filtrados <- df_concepts %>% 
    filter(as.character(ConceptID) %in% as.character(conceitos_com_evento))
  
  choices_vec <- sort(na.omit(unique(df_concepts_filtrados[[nome_col]])))
  selectInput("mapa_conceito_id", "Highlight by Normative Category / Violation:", 
              choices = c("All Categories" = "ALL", choices_vec), width = "100%")
})

# ---- Initial map rendering ----
output$mapa_locais <- renderLeaflet({
  req(nrow(dados_mapa_reativo()) > 0)
  locs <- dados_mapa_reativo()
  
  leaflet(locs) %>%
    addProviderTiles(providers$CartoDB.Positron) %>%
    addCircleMarkers(~Longitude, ~Latitude, layerId = ~ID_Unico, radius = 9, color = ~cor_marcador, stroke = TRUE, weight = 2, fillOpacity = 0.8) %>%
    addLegend("bottomright", colors = c("#9D2235", "#808080"), labels = c("Memory, resistance & events", "Biographical origins"), title = "Location type", opacity = 0.8)
})

# ---- Observe to update map layers (heatmap, markers) ----
observe({
  locs <- dados_mapa_reativo()
  proxy <- leafletProxy("mapa_locais")
  
  proxy %>% clearHeatmap() %>% clearMarkers() %>% clearControls() %>% clearShapes()
  
  if (input$mostrar_heatmap) {
    locs_heat <- locs %>% filter(n_events > 0)
    if (nrow(locs_heat) > 0) {
      set.seed(42)
      locs_heat$LatJitter <- locs_heat$Latitude + runif(nrow(locs_heat), -0.3, 0.3)
      locs_heat$LonJitter <- locs_heat$Longitude + runif(nrow(locs_heat), -0.3, 0.3)
      max_val <- max(locs_heat$n_events, na.rm = TRUE)
      
      proxy %>% addCircleMarkers(
        data = locs_heat, 
        lng = ~LonJitter,
        lat = ~LatJitter,
        radius = ~sqrt(n_events) * 12,
        color = "#9D2235", 
        stroke = FALSE, 
        fillOpacity = 0.45,
        label = ~paste("Documented events:", n_events)
      ) %>%
        addLegend("bottomright", pal = colorNumeric(c("#ff8093", "#9D2235"), domain = c(1, max_val)), 
                  values = c(1, max_val), title = "Event Density", opacity = 0.8)
    } else {
      proxy %>% addLegend("bottomright", colors = "#808080", labels = "No incidents documented", title = "Event Density")
    }
  } else {
    proxy %>% addCircleMarkers(data = locs, lng = ~Longitude, lat = ~Latitude, layerId = ~ID_Unico, radius = 9, color = ~cor_marcador, stroke = TRUE, weight = 2, fillOpacity = 0.8) %>%
      addLegend("bottomright", colors = c("#9D2235", "#808080"), labels = c("Memory, resistance & events", "Biographical origins"), title = "Location type", opacity = 0.8)
  }
})

# ---- Side panel details on marker click ----
output$painel_detalhes_mapa <- renderUI({
  clique <- input$mapa_locais_marker_click
  
  if (input$mostrar_heatmap || is.null(clique)) {
    conceito_pt <- "todas as categorias"
    
    if (!is.null(input$mapa_conceito_id) && input$mapa_conceito_id != "ALL" && nrow(df_concepts) > 0) {
      cols_c <- names(df_concepts)
      col_en <- if("Label_EN" %in% cols_c) "Label_EN" else if("ConceptName_EN" %in% cols_c) "ConceptName_EN" else cols_c[1]
      col_pt <- if("Label_ORIG" %in% cols_c) "Label_ORIG" else if("ConceptName_ORIG" %in% cols_c) "ConceptName_ORIG" else if("Label" %in% cols_c) "Label" else if("ConceptName" %in% cols_c) "ConceptName" else col_en
      
      trans <- df_concepts %>% filter(.data[[col_en]] == input$mapa_conceito_id) %>% pull(.data[[col_pt]])
      if (length(trans) > 0 && !is.na(trans[1]) && trimws(trans[1]) != "") conceito_pt <- paste0("<b>", trans[1], "</b>")
    } else if (!is.null(input$mapa_conceito_id) && input$mapa_conceito_id == "ALL") {
      conceito_pt <- "<b>todas as categorias</b>"
    }
    
    categoria_texto_pt <- paste0("filtrada para a categoria normativa ", conceito_pt)
    categoria_texto_en <- if(!is.null(input$mapa_conceito_id) && input$mapa_conceito_id != "ALL") {
      paste0("filtered for the normative category <b>", input$mapa_conceito_id, "</b>")
    } else {
      "comprehensively encompassing all mapped violations"
    }
    
    botoes_lang <- "<div style='text-align: right; margin-bottom: 10px;'>
                      <button onclick=\"document.getElementById('map-desc-en').style.display='block'; document.getElementById('map-desc-pt').style.display='none';\" style='background-color: #9D2235; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;'>EN</button>
                      <button onclick=\"document.getElementById('map-desc-en').style.display='none'; document.getElementById('map-desc-pt').style.display='block';\" style='background-color: #eee; color: #333; border: 1px solid #ccc; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;'>PT</button>
                    </div>"
    
    return(div(
      class = "painel-lateral",
      HTML(paste0(
        botoes_lang,
        "<div id='map-desc-en' style='display:block; font-family: Roboto; font-size: 13.5px; line-height: 1.6; text-align: justify; color: #444;'>",
        "<h4 style='font-family: Merriweather; color: #9D2235; margin-top: 0; margin-bottom: 20px;'>Geographical Analysis</h4>",
        "<p>Click the <b>\"Enable heatmap layer (event density)\"</b> box to visualise the spatial distribution of civil-military violence and the focal points of working-class political agency. ",
        "The current visualisation is ", categoria_texto_en, ", establishing bridges between the dogmatic-legal framework and empirical incidents (<i>Concepts &rarr; Events &rarr; Persons</i>).<br><br>",
        "<b>Thermal Intensity Layer (Density Bubbles):</b> The crimson-red bubbles express the cumulative density of human rights violations, crimes, torture, deaths or interventions. ",
        "This highlights the geographical concentration of state violence and the territorial strangulation perpetrated against individuals associated with the Metallurgical Trade Union Opposition of São Paulo, as well as related institutions and movements. It is critical to state that the historical documentation includes crimes and violations that are not restricted to official state apparatus, accurately encompassing responsibilities and violent dynamics perpetrated by civilian actors as well. Furthermore, the geographical locations are derived from autonomous archival repositories independent of biographical trajectory datasets.<br><br>",
        "<i>Use the upper menu to isolate specific violation bubbles or disable the density layer to inspect the archival metadata of individual markers.</i></p>",
        "</div>",
        "<div id='map-desc-pt' style='display:none; font-family: Roboto; font-size: 13.5px; line-height: 1.6; text-align: justify; color: #444;'>",
        "<h4 style='font-family: Merriweather; color: #9D2235; margin-top: 0; margin-bottom: 20px;'>Análise Geoespacial</h4>",
        "<p>Clique na caixa <b>\"Enable heatmap layer (event density)\"</b> para visualizar a distribuição espacial da violência cívico-militar e dos focos de agência política operária. ",
        "A visualização atual está ", categoria_texto_pt, ", estabelecendo pontes entre o arcabouço dogmático-jurídico e os incidentes empíricos (Concepts &rarr; Events &rarr; Persons).<br><br>",
        "<b>Camada de Intensidade Termal (Bolhas de Densidade):</b> As bolhas em vermelho-carmim expressam a densidade cumulativa de violações de direitos humanos, crimes, torturas, mortes ou intervenções. ",
        "Isso permite evidenciar a concentração geográfica da violência de Estado e o estrangulamento territorial perpetrado contra pessoas associadas à Oposição Sindical Metalúrgica de São Paulo, instituições e movimentos correlatos. Fica manifesto na documentação que tais violações e crimes não derivam exclusivamente de aparatos de coerção estatal, abarcando de forma fidedigna responsabilidades e dinâmicas violadoras perpetradas também por atores civis. Outrossim, sublinha-se que a determinação geográfica dos locais provém de fontes arquivísticas independentes daquelas que sustentam os registros de trajetórias biográficas.<br><br>",
        "<i>Utilize o menu superior para isolar bolhas de violações específicas ou desative a camada termal para inspecionar os metadados arquivísticos de marcadores individuais.</i></p>",
        "</div>"
      ))
    ))
  }
  
  # If a specific marker was clicked (and heatmap is off)
  loc_clicado <- dados_mapa_reativo() %>% filter(ID_Unico == clique$id)
  req(nrow(loc_clicado) > 0)
  
  place_id <- loc_clicado$PlaceID[1]
  colunas <- names(loc_clicado)
  col_en <- grep("PlaceName.*EN|Name.*EN", colunas, ignore.case = TRUE, value = TRUE)
  col_pt <- grep("PlaceName.*ORIG|PlaceName|Name", colunas, ignore.case = TRUE, value = TRUE)
  col_pt <- setdiff(col_pt, col_en)
  
  titulo_en <- "Location"
  if(length(col_en) > 0 && !is.na(loc_clicado[[col_en[1]]][1]) && trimws(as.character(loc_clicado[[col_en[1]]][1])) != "") {
    titulo_en <- trimws(as.character(loc_clicado[[col_en[1]]][1]))
  }
  
  titulo_pt <- titulo_en
  if(length(col_pt) > 0 && !is.na(loc_clicado[[col_pt[1]]][1]) && trimws(as.character(loc_clicado[[col_pt[1]]][1])) != "") {
    titulo_pt <- trimws(as.character(loc_clicado[[col_pt[1]]][1]))
  }
  
  endereco <- if("Address" %in% names(loc_clicado) && !is.na(loc_clicado$Address[1]) && loc_clicado$Address[1] != "") paste0("<p style='font-family: Roboto; font-size: 13.5px; color: #555; border-bottom: 1px solid #eee; padding-bottom: 10px;'><i class='fa fa-map-marker'></i> ", loc_clicado$Address[1], "</p>") else ""
  resumo_en <- if("MDH_Summary_EN" %in% names(loc_clicado) && !is.na(loc_clicado$MDH_Summary_EN[1]) && loc_clicado$MDH_Summary_EN[1] != "") loc_clicado$MDH_Summary_EN[1] else ""
  resumo_pt <- if("MDH_Summary" %in% names(loc_clicado) && !is.na(loc_clicado$MDH_Summary[1]) && loc_clicado$MDH_Summary[1] != "") loc_clicado$MDH_Summary[1] else ""
  
  context_en <- ""
  context_pt <- ""
  
  if(nrow(df_persons) > 0 && "BirthPlaceID" %in% names(df_persons)) {
    p_nasc <- df_persons %>% filter(BirthPlaceID == place_id) %>% pull(Name) %>% unique() %>% na.omit()
    p_mort <- df_persons %>% filter(DeathPlaceID == place_id) %>% pull(Name) %>% unique() %>% na.omit()
    if(length(p_nasc) > 0) { context_en <- paste0(context_en, "<p style='margin-bottom: 5px;'><b>Born here:</b> ", paste(p_nasc, collapse=", "), "</p>"); context_pt <- paste0(context_pt, "<p style='margin-bottom: 5px;'><b>Nascimento:</b> ", paste(p_nasc, collapse=", "), "</p>") }
    if(length(p_mort) > 0) { context_en <- paste0(context_en, "<p style='margin-bottom: 5px;'><b>Died here:</b> ", paste(p_mort, collapse=", "), "</p>"); context_pt <- paste0(context_pt, "<p style='margin-bottom: 5px;'><b>Falecimento:</b> ", paste(p_mort, collapse=", "), "</p>") }
  }
  
  if(nrow(df_events) > 0 && "PlaceID" %in% names(df_events)) {
    evs <- df_events %>% filter(PlaceID == place_id)
    if(nrow(evs) > 0) {
      if(nrow(df_event_persons) > 0 && "EventID" %in% names(df_event_persons)) {
        evs <- evs %>% left_join(df_event_persons %>% select(EventID, PersonID), by="EventID", relationship = "many-to-many") %>% left_join(df_persons %>% select(PersonID, Name), by="PersonID")
      } else { evs$Name <- NA }
      
      evs_formatados <- evs %>% mutate(data_limpa = case_when((!is.na(StartDate) & StartDate != "") & (!is.na(EndDate) & EndDate != "") ~ paste0(" (", StartDate, " to ", EndDate, ")"), (!is.na(StartDate) & StartDate != "") ~ paste0(" (", StartDate, ")"), TRUE ~ "")) %>% group_by(EventType, data_limpa) %>% summarise(Envolvidos = paste(na.omit(unique(Name)), collapse = ", "), .groups="drop") %>% mutate(item_lista = paste0("<li>", EventType, data_limpa, ifelse(Envolvidos != "", paste0(" - ", Envolvidos), ""), "</li>"))
      lista_evs_str <- paste(evs_formatados$item_lista, collapse="")
      if(lista_evs_str != "") { context_en <- paste0(context_en, "<p style='margin-top: 10px; margin-bottom: 2px;'><b>Associated events:</b></p><ul style='padding-left: 20px; margin-bottom: 0;'>", lista_evs_str, "</ul>"); context_pt <- paste0(context_pt, "<p style='margin-top: 10px; margin-bottom: 2px;'><b>Eventos associados:</b></p><ul style='padding-left: 20px; margin-bottom: 0;'>", lista_evs_str, "</ul>") }
    }
  }
  
  div_en <- if(resumo_en != "") paste0("<div style='font-family: Roboto; font-size: 14px; line-height: 1.6; color: #333; text-align: justify; margin-bottom: 15px;'>", resumo_en, "</div>") else ""
  div_pt <- if(resumo_pt != "") paste0("<div style='font-family: Roboto; font-size: 14px; line-height: 1.6; color: #333; text-align: justify; margin-bottom: 15px;'>", resumo_pt, "</div>") else ""
  if(context_en != "") { context_en <- paste0("<div style='padding-top: 10px; border-top: 1px dashed #ccc;'>", context_en, "</div>"); context_pt <- paste0("<div style='padding-top: 10px; border-top: 1px dashed #ccc;'>", context_pt, "</div>") }
  
  citacao_html <- gera_citacao(loc_clicado)
  botoes_lang <- "<div style='text-align: right; margin-bottom: 10px;'>
                    <button onclick=\"document.getElementById('loc-en').style.display='block'; document.getElementById('loc-pt').style.display='none';\" style='background-color: #9D2235; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;'>EN</button>
                    <button onclick=\"document.getElementById('loc-en').style.display='none'; document.getElementById('loc-pt').style.display='block';\" style='background-color: #eee; color: #333; border: 1px solid #ccc; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;'>PT</button>
                  </div>"
  
  HTML(paste0(
    "<div class='painel-lateral'>",
    botoes_lang,
    "<div id='loc-en' style='display:block;'>",
    "<h3 style='font-family: Merriweather; color: #9D2235; margin-top: 0;'>", titulo_en, "</h3>",
    endereco, div_en, context_en,
    "</div>",
    "<div id='loc-pt' style='display:none;'>",
    "<h3 style='font-family: Merriweather; color: #9D2235; margin-top: 0;'>", titulo_pt, "</h3>",
    endereco, div_pt, context_pt,
    "</div>",
    citacao_html,
    "</div>"
  ))
})