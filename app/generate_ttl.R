# ttl_generator.R
# Gera arquivo TTL a partir dos CSVs na pasta "app"
# Execute este script uma vez para gerar o data.ttl

library(utils)  # para read.csv

# Função para limpar e criar URI válida
clean_uri <- function(value) {
  if (is.na(value) || value == "") return(NA)
  v <- as.character(value)
  v <- trimws(v)
  # Remove caracteres especiais, substitui por "_"
  v <- gsub("[^a-zA-Z0-9_]", "_", v)
  v <- gsub("_+", "_", v)
  v <- gsub("^_|_$", "", v)
  return(v)
}

# Função para escapar literais
clean_literal <- function(value) {
  if (is.na(value) || value == "") return("")
  v <- as.character(value)
  v <- trimws(v)
  v <- gsub('\\', '\\\\', v, fixed = TRUE)
  v <- gsub('"', '\\"', v, fixed = TRUE)
  v <- gsub("\n", " ", v)
  v <- gsub("\r", " ", v)
  v <- gsub("\\s+", " ", v)
  return(v)
}

# Diretório onde estão os CSVs
csv_dir <- "app"

# Lista de arquivos CSV esperados
entity_files <- c("Persons.csv", "Documents.csv", "Institutions.csv", 
                  "Movements.csv", "Events.csv", "Locations.csv", "Concepts.csv")
relation_files <- c("DocumentPersons.csv", "DocumentEvents.csv", "DocumentLocations.csv",
                    "EventPersons.csv", "EventConcepts.csv", "EventActors.csv",
                    "PersonInstitutions.csv", "PersonMovements.csv", "EventDetails.csv")

# Prefixos
triples <- c(
  "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .",
  "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
  "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .",
  "@prefix atlas: <http://example.org/atlas/> .",
  ""
)

# Função para processar entidades
process_entities <- function() {
  for (f in entity_files) {
    file_path <- file.path(csv_dir, f)
    if (!file.exists(file_path)) {
      message("Arquivo não encontrado: ", file_path)
      next
    }
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    # Determinar o tipo de entidade e colunas
    if (grepl("Persons", f)) {
      class_type <- "Person"
      id_col <- "PersonID"
      label_col <- "Label"  # pode ser "Name" também
    } else if (grepl("Documents", f)) {
      class_type <- "Document"
      id_col <- "DocumentID"
      label_col <- "Title"
    } else if (grepl("Institutions", f)) {
      class_type <- "Institution"
      id_col <- "InstitutionID"
      label_col <- "Label"
    } else if (grepl("Movements", f)) {
      class_type <- "Movement"
      id_col <- "MovementID"
      label_col <- "Label"
    } else if (grepl("Events", f)) {
      class_type <- "Event"
      id_col <- "EventID"
      label_col <- "Label"
    } else if (grepl("Locations", f)) {
      class_type <- "Location"
      id_col <- "LocationID"
      label_col <- "Label"
    } else if (grepl("Concepts", f)) {
      class_type <- "Concept"
      id_col <- "ConceptID"
      label_col <- "Label"
    } else {
      next
    }
    
    for (i in 1:nrow(df)) {
      id <- clean_uri(df[i, id_col])
      if (is.na(id)) next
      triples <<- c(triples, paste0("atlas:", id, " rdf:type atlas:", class_type, " ."))
      # Label
      label <- df[i, label_col]
      if (!is.na(label) && label != "") {
        triples <<- c(triples, paste0('atlas:', id, ' rdfs:label "', clean_literal(label), '"@en .'))
      }
      # ID próprio (ex: personID)
      id_prop <- tolower(class_type)  # personID, documentID, etc.
      id_val <- df[i, id_col]
      if (!is.na(id_val) && id_val != "") {
        triples <<- c(triples, paste0('atlas:', id, ' atlas:', id_prop, ' "', clean_literal(id_val), '"^^xsd:string .'))
      }
    }
  }
}

# Função para processar relações
process_relations <- function() {
  # DocumentPersons
  file_path <- file.path(csv_dir, "DocumentPersons.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      doc <- clean_uri(df[i, "DocumentID"])
      pers <- clean_uri(df[i, "PersonID"])
      rel <- clean_uri(df[i, "RelationshipType"])
      if (!is.na(doc) && !is.na(pers) && !is.na(rel)) {
        triples <<- c(triples, paste0("atlas:", doc, " atlas:", rel, " atlas:", pers, " ."))
      }
    }
  }
  
  # DocumentEvents
  file_path <- file.path(csv_dir, "DocumentEvents.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      doc <- clean_uri(df[i, "DocumentID"])
      ev <- clean_uri(df[i, "EventID"])
      if (!is.na(doc) && !is.na(ev)) {
        triples <<- c(triples, paste0("atlas:", doc, " atlas:describes atlas:", ev, " ."))
      }
    }
  }
  
  # DocumentLocations
  file_path <- file.path(csv_dir, "DocumentLocations.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      doc <- clean_uri(df[i, "DocumentID"])
      loc <- clean_uri(df[i, "PlaceID"])
      rel <- clean_uri(df[i, "RelationType"])
      if (!is.na(doc) && !is.na(loc) && !is.na(rel)) {
        triples <<- c(triples, paste0("atlas:", doc, " atlas:", rel, " atlas:", loc, " ."))
      }
    }
  }
  
  # EventPersons
  file_path <- file.path(csv_dir, "EventPersons.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      ev <- clean_uri(df[i, "EventID"])
      pers <- clean_uri(df[i, "PersonID"])
      role <- clean_uri(df[i, "Role"])
      if (!is.na(ev) && !is.na(pers) && !is.na(role)) {
        triples <<- c(triples, paste0("atlas:", pers, " atlas:", role, " atlas:", ev, " ."))
      }
    }
  }
  
  # EventConcepts
  file_path <- file.path(csv_dir, "EventConcepts.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      ev <- clean_uri(df[i, "EventID"])
      con <- clean_uri(df[i, "ConceptID"])
      rel <- clean_uri(df[i, "RelationType"])
      if (!is.na(ev) && !is.na(con) && !is.na(rel)) {
        triples <<- c(triples, paste0("atlas:", ev, " atlas:", rel, " atlas:", con, " ."))
      }
    }
  }
  
  # EventActors
  file_path <- file.path(csv_dir, "EventActors.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      ev <- clean_uri(df[i, "EventID"])
      actor <- clean_uri(df[i, "ActorID"])
      role <- clean_uri(df[i, "Role"])
      if (!is.na(ev) && !is.na(actor) && !is.na(role)) {
        triples <<- c(triples, paste0("atlas:", ev, " atlas:", role, " atlas:", actor, " ."))
      }
    }
  }
  
  # PersonInstitutions
  file_path <- file.path(csv_dir, "PersonInstitutions.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      pers <- clean_uri(df[i, "PersonID"])
      inst <- clean_uri(df[i, "InstitutionID"])
      role <- clean_uri(df[i, "Role"])
      if (!is.na(pers) && !is.na(inst) && !is.na(role)) {
        triples <<- c(triples, paste0("atlas:", pers, " atlas:", role, " atlas:", inst, " ."))
      }
    }
  }
  
  # PersonMovements
  file_path <- file.path(csv_dir, "PersonMovements.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      pers <- clean_uri(df[i, "PersonID"])
      mov <- clean_uri(df[i, "MovementID"])
      role <- clean_uri(df[i, "Role"])
      if (!is.na(pers) && !is.na(mov) && !is.na(role)) {
        triples <<- c(triples, paste0("atlas:", pers, " atlas:", role, " atlas:", mov, " ."))
      }
    }
  }
  
  # EventDetails (literais)
  file_path <- file.path(csv_dir, "EventDetails.csv")
  if (file.exists(file_path)) {
    df <- read.csv(file_path, stringsAsFactors = FALSE, encoding = "UTF-8")
    for (i in 1:nrow(df)) {
      ev <- clean_uri(df[i, "EventID"])
      detail_type <- clean_uri(df[i, "DetailType"])
      detail_value <- clean_literal(df[i, "DetailValue"])
      if (!is.na(ev) && !is.na(detail_type) && detail_value != "") {
        triples <<- c(triples, paste0('atlas:', ev, ' atlas:', detail_type, ' "', detail_value, '"@en .'))
      }
    }
  }
}

# Executa
process_entities()
process_relations()

# Escreve arquivo
output_file <- "data.ttl"
writeLines(triples, output_file, useBytes = TRUE)
message("TTL gerado com sucesso em ", output_file, " - ", length(triples), " linhas.")