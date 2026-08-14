library(dplyr)
library(stringr)

# Define a pasta onde estão os CSVs (ajuste se necessário)
setwd("C:/Users/mille/OneDrive/Área de Trabalho/SPARQL test/test_sparql/app")

# Ler CSVs
persons <- read.csv("Persons.csv", stringsAsFactors = FALSE)
institutions <- read.csv("Institutions.csv", stringsAsFactors = FALSE)
movements <- read.csv("Movements.csv", stringsAsFactors = FALSE)
events <- read.csv("Events.csv", stringsAsFactors = FALSE)
locations <- read.csv("Locations.csv", stringsAsFactors = FALSE)
concepts <- read.csv("Concepts.csv", stringsAsFactors = FALSE)
documents <- read.csv("Documents.csv", stringsAsFactors = FALSE)
person_inst <- read.csv("PersonInstitutions.csv", stringsAsFactors = FALSE)
person_mov <- read.csv("PersonMovements.csv", stringsAsFactors = FALSE)
event_persons <- read.csv("EventPersons.csv", stringsAsFactors = FALSE)
event_concepts <- read.csv("EventConcepts.csv", stringsAsFactors = FALSE)

clean_uri <- function(x) {
  x <- gsub("[^a-zA-Z0-9]", "_", x)
  x <- gsub("_+", "_", x)
  x <- trimws(x)
  return(x)
}

ttl_file <- "data_with_instances.ttl"

# Cabeçalho
cat("@prefix owl: <http://www.w3.org/2002/07/owl#> .\n", file = ttl_file)
cat("@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n", file = ttl_file, append = TRUE)
cat("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n", file = ttl_file, append = TRUE)
cat("@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n", file = ttl_file, append = TRUE)
cat("@prefix core: <http://data.sparnatural.eu/core/> .\n", file = ttl_file, append = TRUE)
cat("@prefix atlas: <http://example.org/atlas/> .\n\n", file = ttl_file, append = TRUE)

# ---- Pessoas ----
for (i in 1:nrow(persons)) {
  name <- clean_uri(persons$Name[i])
  if (name == "") next
  cat("atlas:Person_", name, " rdf:type atlas:Person ;\n", sep = "", file = ttl_file, append = TRUE)
  cat("  rdfs:label \"", persons$Name[i], "\"@en ;\n", sep = "", file = ttl_file, append = TRUE)
  cat("  atlas:personID \"", persons$PersonID[i], "\"^^xsd:string .\n\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Instituições ----
for (i in 1:nrow(institutions)) {
  name <- clean_uri(institutions$Name_ORIG[i])
  if (name == "") next
  cat("atlas:Institution_", name, " rdf:type atlas:Institution ;\n", sep = "", file = ttl_file, append = TRUE)
  cat("  rdfs:label \"", institutions$Name_ORIG[i], "\"@pt ;\n", sep = "", file = ttl_file, append = TRUE)
  cat("  atlas:institutionID \"", institutions$InstitutionID[i], "\"^^xsd:string .\n\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Movimentos ----
for (i in 1:nrow(movements)) {
  name <- clean_uri(movements$Name_ORIG[i])
  if (name == "") next
  cat("atlas:Movement_", name, " rdf:type atlas:Movement ;\n", sep = "", file = ttl_file, append = TRUE)
  cat("  rdfs:label \"", movements$Name_ORIG[i], "\"@pt ;\n", sep = "", file = ttl_file, append = TRUE)
  cat("  atlas:movementID \"", movements$MovementID[i], "\"^^xsd:string .\n\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Eventos ----
for (i in 1:nrow(events)) {
  ev_id <- clean_uri(events$EventID[i])
  if (ev_id == "") next
  cat("atlas:Event_", ev_id, " rdf:type atlas:Event ;\n", sep = "", file = ttl_file, append = TRUE)
  cat("  rdfs:label \"", events$EventType[i], "\"@en ;\n", sep = "", file = ttl_file, append = TRUE)
  cat("  atlas:eventID \"", events$EventID[i], "\"^^xsd:string .\n\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Locais ----
for (i in 1:nrow(locations)) {
  loc <- clean_uri(locations$PlaceID[i])
  if (loc == "") next
  cat("atlas:Location_", loc, " rdf:type atlas:Location ;\n", sep = "", file = ttl_file, append = TRUE)
  if ("PlaceName_EN" %in% names(locations) && !is.na(locations$PlaceName_EN[i]) && locations$PlaceName_EN[i] != "") {
    cat("  rdfs:label \"", locations$PlaceName_EN[i], "\"@en ;\n", sep = "", file = ttl_file, append = TRUE)
  }
  cat("  atlas:locationID \"", locations$PlaceID[i], "\"^^xsd:string .\n\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Conceitos (Categorias Normativas) ----
for (i in 1:nrow(concepts)) {
  cid <- clean_uri(concepts$ConceptID[i])
  if (cid == "") next
  cat("atlas:Concept_", cid, " rdf:type atlas:NormativeCategory ;\n", sep = "", file = ttl_file, append = TRUE)
  if ("Label_EN" %in% names(concepts) && !is.na(concepts$Label_EN[i]) && concepts$Label_EN[i] != "") {
    cat("  rdfs:label \"", concepts$Label_EN[i], "\"@en ;\n", sep = "", file = ttl_file, append = TRUE)
  }
  cat("  atlas:conceptID \"", concepts$ConceptID[i], "\"^^xsd:string .\n\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Relações: Pessoa → Instituição ----
for (i in 1:nrow(person_inst)) {
  pid <- persons$Name[persons$PersonID == person_inst$PersonID[i]]
  iid <- institutions$Name_ORIG[institutions$InstitutionID == person_inst$InstitutionID[i]]
  if (length(pid) == 0 || length(iid) == 0) next
  p_uri <- clean_uri(pid[1])
  i_uri <- clean_uri(iid[1])
  cat("atlas:Person_", p_uri, " atlas:affiliatedWith atlas:Institution_", i_uri, " .\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Relações: Pessoa → Movimento ----
for (i in 1:nrow(person_mov)) {
  pid <- persons$Name[persons$PersonID == person_mov$PersonID[i]]
  mid <- movements$Name_ORIG[movements$MovementID == person_mov$MovementID[i]]
  if (length(pid) == 0 || length(mid) == 0) next
  p_uri <- clean_uri(pid[1])
  m_uri <- clean_uri(mid[1])
  cat("atlas:Person_", p_uri, " atlas:affiliatedWith atlas:Movement_", m_uri, " .\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Relações: Pessoa → Evento ----
for (i in 1:nrow(event_persons)) {
  pid <- persons$Name[persons$PersonID == event_persons$PersonID[i]]
  eid <- events$EventID[events$EventID == event_persons$EventID[i]]
  if (length(pid) == 0 || length(eid) == 0) next
  p_uri <- clean_uri(pid[1])
  e_uri <- clean_uri(eid[1])
  cat("atlas:Person_", p_uri, " atlas:involvedIn atlas:Event_", e_uri, " .\n", sep = "", file = ttl_file, append = TRUE)
}

# ---- Relações: Evento → Conceito ----
for (i in 1:nrow(event_concepts)) {
  cid <- concepts$ConceptID[concepts$ConceptID == event_concepts$ConceptID[i]]
  eid <- events$EventID[events$EventID == event_concepts$EventID[i]]
  if (length(cid) == 0 || length(eid) == 0) next
  c_uri <- clean_uri(cid[1])
  e_uri <- clean_uri(eid[1])
  cat("atlas:Event_", e_uri, " atlas:characterizedAs atlas:Concept_", c_uri, " .\n", sep = "", file = ttl_file, append = TRUE)
}

# Fim
cat("\n# ---- Gerado a partir dos CSVs ----\n", file = ttl_file, append = TRUE)
message("Arquivo TTL gerado com sucesso: ", ttl_file)