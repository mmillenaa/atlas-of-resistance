
# global.R — Atlas of Resistance
# Configuração, dados e recursos estáticos

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

# ------------------------------------------------------------
# 1. IMAGENS: caminho portátil para Windows e hospedagem Linux
# ------------------------------------------------------------

if (dir.exists("assets")) {
  addResourcePath(
    "assets",
    normalizePath("assets", winslash = "/", mustWork = TRUE)
  )
} else {
  warning("Pasta app/assets não encontrada.")
}

# ------------------------------------------------------------
# 2. LEITURA DOS CSVs
# ------------------------------------------------------------

data_dir <- if (file.exists("Persons.csv")) {
  "."
} else if (file.exists(file.path("data", "Persons.csv"))) {
  "data"
} else {
  "."
}

read_atlas_csv <- function(filename) {
  path <- file.path(data_dir, filename)
  
  if (!file.exists(path)) {
    warning(paste("Arquivo ausente:", path))
    return(data.frame())
  }
  
  tryCatch(
    read.csv(
      path,
      sep = ",",
      stringsAsFactors = FALSE,
      fileEncoding = "UTF-8-BOM",
      check.names = FALSE,
      na.strings = c("", "NA")
    ),
    error = function(e) {
      warning(paste("Erro ao ler", filename, ":", e$message))
      data.frame()
    }
  )
}

df_persons <- read_atlas_csv("Persons.csv")
df_institutions <- read_atlas_csv("Institutions.csv")
df_person_inst <- read_atlas_csv("PersonInstitutions.csv")
df_movements <- read_atlas_csv("Movements.csv")
df_person_movements <- read_atlas_csv("PersonMovements.csv")
df_locations <- read_atlas_csv("Locations.csv")
df_events <- read_atlas_csv("Events.csv")
df_event_persons <- read_atlas_csv("EventPersons.csv")
df_concepts <- read_atlas_csv("Concepts.csv")
df_event_concepts <- read_atlas_csv("EventConcepts.csv")
df_documents <- read_atlas_csv("Documents.csv")
df_document_persons <- read_atlas_csv("DocumentPersons.csv")

# ------------------------------------------------------------
# 3. TABELA DE RELAÇÕES PARA O REPOSITÓRIO DE DADOS
# O grafo visual usará IDs próprios em server_network.R.
# ------------------------------------------------------------

empty_edges <- function() {
  data.frame(
    from = character(),
    to = character(),
    label = character(),
    EvidenceText_EN = character(),
    EvidenceText_ORIG = character(),
    StartDate = character(),
    EndDate = character(),
    stringsAsFactors = FALSE
  )
}

optional_column <- function(df, col) {
  if (col %in% names(df)) {
    return(as.character(df[[col]]))
  }
  rep(NA_character_, nrow(df))
}

make_display_edges <- function(rel, target, id_col, label_col) {
  
  if (
    nrow(rel) == 0 ||
    nrow(target) == 0 ||
    nrow(df_persons) == 0 ||
    !all(c("PersonID", "Role", id_col) %in% names(rel)) ||
    !all(c("PersonID", "Name") %in% names(df_persons)) ||
    !all(c(id_col, label_col) %in% names(target))
  ) {
    return(empty_edges())
  }
  
  joined <- merge(
    rel,
    df_persons[, c("PersonID", "Name"), drop = FALSE],
    by = "PersonID"
  )
  
  joined <- merge(
    joined,
    target[, c(id_col, label_col), drop = FALSE],
    by = id_col
  )
  
  if (nrow(joined) == 0) return(empty_edges())
  
  role <- as.character(joined$Role)
  role[is.na(role) | !nzchar(role)] <- "associated_with"
  role <- gsub("_", " ", role, fixed = TRUE)
  
  data.frame(
    from = as.character(joined$Name),
    to = as.character(joined[[label_col]]),
    label = role,
    EvidenceText_EN = optional_column(joined, "EvidenceText_EN"),
    EvidenceText_ORIG = optional_column(joined, "EvidenceText_ORIG"),
    StartDate = optional_column(joined, "StartDate"),
    EndDate = optional_column(joined, "EndDate"),
    stringsAsFactors = FALSE
  )
}

edges_inst <- make_display_edges(
  df_person_inst,
  df_institutions,
  "InstitutionID",
  "Name_ORIG"
)

edges_mov <- make_display_edges(
  df_person_movements,
  df_movements,
  "MovementID",
  "Name_ORIG"
)

edges <- dplyr::bind_rows(edges_inst, edges_mov)

# ------------------------------------------------------------
# 4. CITAÇÕES
# ------------------------------------------------------------

gera_citacao <- function(row_data) {
  cit <- ""
  
  if (
    "Source_MDH" %in% names(row_data) &&
    !is.na(row_data$Source_MDH[1]) &&
    toupper(trimws(as.character(row_data$Source_MDH[1]))) %in%
    c("TRUE", "1", "V", "VERDADEIRO")
  ) {
    cit <- paste0(
      cit,
      "<div style='font-size:11px;color:#666;",
      "border-top:1px solid #ddd;margin-top:12px;",
      "padding-top:8px;'>",
      "<b>MDH Source:</b> BRASIL. Ministério dos Direitos ",
      "Humanos e da Cidadania. Observatório Nacional dos ",
      "Direitos Humanos — ObservaDH. Brasília, 2023.",
      "</div>"
    )
  }
  
  if (
    "OWN" %in% names(row_data) &&
    !is.na(row_data$OWN[1]) &&
    toupper(trimws(as.character(row_data$OWN[1]))) %in%
    c("TRUE", "1", "V", "VERDADEIRO")
  ) {
    cit <- paste0(
      cit,
      "<div style='font-size:11px;color:#666;",
      "border-top:1px solid #ddd;margin-top:12px;",
      "padding-top:8px;'>",
      "<b>Source:</b> Elaborado por ",
      "Millena Miranda Franco, 2026.</div>"
    )
  }
  
  cit
}

# ------------------------------------------------------------
# 5. TEMA E CABEÇALHO — VISUAL ORIGINAL PRESERVADO
# ------------------------------------------------------------

tema_max_planck <- bs_theme(
  version = 5,
  primary = "#9D2235",
  base_font = font_google("Roboto"),
  heading_font = font_google("Merriweather")
)

cabecalho_customizado <- div(
  style = paste0(
    "background-color:#ffffff;",
    "padding:30px 50px;",
    "display:flex;",
    "align-items:center;",
    "justify-content:space-between;",
    "border-bottom:2px solid #9D2235;"
  ),
  
  div(
    style = "max-width:70%;",
    h1(
      paste0(
        "Atlas of resistance to the civil-military ",
        "dictatorship in Brazil: violations, crimes, ",
        "and political agency (1964-1985)"
      ),
      style = paste0(
        "font-family:'Merriweather',serif;",
        "color:#9D2235;font-size:2.2em;",
        "margin:0;line-height:1.2;"
      )
    )
  ),
  
  div(
    style = "text-align:right;min-width:250px;",
    img(
      src = "assets/pngegg.png",
      alt = "América Invertida — Joaquín Torres García",
      style = "height:160px;margin-bottom:8px;"
    ),
    p(
      "América Invertida (1943). Joaquín Torres García.",
      style = paste0(
        "font-size:0.8em;color:#666;",
        "margin:0;font-family:'Roboto',sans-serif;"
      )
    )
  )
)
