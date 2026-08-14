# global.R
library(shiny)
library(visNetwork)
library(dplyr)
library(bslib)
library(DT)
library(leaflet)
library(leaflet.extras)
library(stringr)
library(ggplot2)
library(httr)
library(jsonlite)

# ---- Resource path for logo ----
addResourcePath("assets", "C:/Users/mille/eclipse-workspace/Brazil1964DictatorshipGraph")

# ---- Read data ----
df_persons <- tryCatch(read.csv("Persons.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_institutions <- tryCatch(read.csv("Institutions.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_person_inst <- tryCatch(read.csv("PersonInstitutions.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_movements <- tryCatch(read.csv("Movements.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_person_movements <- tryCatch(read.csv("PersonMovements.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_locations <- tryCatch(read.csv("Locations.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_events <- tryCatch(read.csv("Events.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_event_persons <- tryCatch(read.csv("EventPersons.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_concepts <- tryCatch(read.csv("Concepts.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_event_concepts <- tryCatch(read.csv("EventConcepts.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_documents <- tryCatch(read.csv("Documents.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())
df_document_persons <- tryCatch(read.csv("DocumentPersons.csv", sep=",", stringsAsFactors=FALSE, fileEncoding="UTF-8"), error = function(e) data.frame())

# ---- Build edges ----
edges_inst <- data.frame()
if(nrow(df_person_inst) > 0 && nrow(df_persons) > 0 && nrow(df_institutions) > 0) {
  edges_inst <- df_person_inst %>%
    left_join(df_persons %>% select(any_of(c("PersonID", "Name"))), by = "PersonID") %>%
    left_join(df_institutions %>% select(any_of(c("InstitutionID", "Name_ORIG"))), by = "InstitutionID") %>%
    filter(!is.na(Name) & !is.na(Name_ORIG)) %>%
    select(from = Name, to = Name_ORIG, label = Role,
           any_of(c("EvidenceText_EN", "EvidenceText_ORIG", "StartDate", "EndDate"))) %>%
    mutate(across(everything(), as.character))
}

edges_mov <- data.frame()
if(nrow(df_person_movements) > 0 && nrow(df_persons) > 0 && nrow(df_movements) > 0) {
  edges_mov <- df_person_movements %>%
    left_join(df_persons %>% select(any_of(c("PersonID", "Name"))), by = "PersonID") %>%
    left_join(df_movements %>% select(any_of(c("MovementID", "Name_ORIG"))), by = "MovementID") %>%
    filter(!is.na(Name) & !is.na(Name_ORIG)) %>%
    select(from = Name, to = Name_ORIG, label = Role,
           any_of(c("EvidenceText_EN", "EvidenceText_ORIG", "StartDate", "EndDate"))) %>%
    mutate(across(everything(), as.character))
}

edges <- bind_rows(edges_inst, edges_mov)

if(nrow(edges) > 0) {
  edges$label <- str_replace_all(edges$label, "_", " ")
  edges$label <- paste0(toupper(substr(edges$label, 1, 1)), substr(edges$label, 2, nchar(edges$label)))
}

# ---- Helper function for citation ----
gera_citacao <- function(row_data) {
  cit <- ""
  if("Source_MDH" %in% names(row_data) && !is.na(row_data$Source_MDH[1])) {
    if(toupper(trimws(as.character(row_data$Source_MDH[1]))) %in% c("TRUE", "1", "V", "VERDADEIRO")) {
      cit <- paste0(cit, "<div style='font-size: 10.5px; color: #666; margin-top: 10px; line-height: 1.3; border-top: 1px solid #ddd; padding-top: 10px;'><b>MDH Source:</b> BRASIL. Ministério dos Direitos Humanos e da Cidadania. Observatório Nacional dos Direitos Humanos – ObservaDH. Brasília: MDHC, 2023. Disponível em: https://observadh.mdh.gov.br/. Acesso em: 12 jun. 2026.</div>")
    }
  }
  if("OWN" %in% names(row_data) && !is.na(row_data$OWN[1])) {
    if(toupper(trimws(as.character(row_data$OWN[1]))) %in% c("TRUE", "1", "V", "VERDADEIRO")) {
      cit <- paste0(cit, "<div style='font-size: 10.5px; color: #666; margin-top: 10px; line-height: 1.3; border-top: 1px solid #ddd; padding-top: 10px;'><b>Source:</b> Elaborado por Millena Miranda Franco, 2026.</div>")
    }
  }
  return(cit)
}

# ---- Theme and header ----
tema_max_planck <- bs_theme(version = 5, primary = "#9D2235", base_font = font_google("Roboto"), heading_font = font_google("Merriweather"))

cabecalho_customizado <- div(
  style = "background-color: #ffffff; padding: 30px 50px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #9D2235;",
  div(
    style = "max-width: 70%;",
    h1("Atlas of resistance to the civil-military dictatorship in Brazil: violations, crimes, and political agency (1964-1985)",
       style = "font-family: 'Merriweather', serif; color: #9D2235; font-size: 2.2em; margin: 0; line-height: 1.2;")
  ),
  div(
    style = "text-align: right; min-width: 250px;",
    img(src = "assets/pngegg.png", alt = "América Invertida - Joaquín Torres García", style = "height: 160px; margin-bottom: 8px;"),
    p("América Invertida (1943). Joaquín Torres García.", style = "font-size: 0.8em; color: #666; margin: 0; font-family: 'Roboto', sans-serif;")
  )
)