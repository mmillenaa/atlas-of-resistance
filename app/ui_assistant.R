ui_assistant <- function() {
  tagList(
    tags$head(
      tags$style(HTML("
        .query-block {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }
        .entity-box {
          background-color: transparent; 
          color: #333;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .arrow-box {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
        }
        
        .run-query-btn {
          background-image: url('icons/RunQuery1.png');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          background-color: transparent;
          border: none;
          width: 200px;
          height: 100px;
          margin-left: auto;
          cursor: pointer;
          transition: transform 0.1s;
        }
        
        .run-query-btn:active {
          transform: scale(0.95);
        }
        
        .run-query-btn.is-loading {
          animation: runFrames 0.8s infinite step-end; 
        }
        
        @keyframes runFrames {
          0% { background-image: url('icons/RunQuery1.png'); }
          16.6% { background-image: url('icons/RunQuery2.png'); }
          33.3% { background-image: url('icons/RunQuery3.png'); }
          50% { background-image: url('icons/RunQuery4.png'); }
          66.6% { background-image: url('icons/RunQuery5.png'); }
          83.3% { background-image: url('icons/RunQuery6.png'); }
          100% { background-image: url('icons/RunQuery1.png'); }
        }
        
        .entity-box .form-group { margin-bottom: 0px; }
      ")),
      
      tags$script(HTML("
        let minTimeMet = true;
        let isIdle = true;
        
        $(document).on('click', '#run_sparql', function() {
          $('#run_sparql').addClass('is-loading');
          minTimeMet = false;
          isIdle = false;
          
          setTimeout(function() {
            minTimeMet = true;
            if (isIdle) {
              $('#run_sparql').removeClass('is-loading');
            }
          }, 1600); 
        });
        
        $(document).on('shiny:idle', function() {
          isIdle = true;
          if (minTimeMet) {
            $('#run_sparql').removeClass('is-loading');
          }
        });
      "))
    ),
    
    fluidPage(
      h3("Semantic Query Builder", style = "font-family: 'Merriweather', serif; color: #424242; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 25px;"),
      
      # NOVO TEXTO EXPLICATIVO INSERIDO AQUI
      p(HTML("The Semantic Query Builder operates on a linked data architecture driven by Apache Jena Fuseki. The underlying ontology is structured using Resource Description Framework (RDF) triples serialized in Turtle (.ttl) files, establishing meaningful semantic relationships between historical entities. Through a SPARQL HTTP endpoint, this RShiny interface communicates directly with the machine-readable backend, allowing users to dynamically query the network. To navigate the database, please select the desired Subject, Predicate, and Object from the available dropdown menus, and always click the 'Run' button on the right side to execute the search and retrieve the corresponding records. Please note that this module is currently in its implementation phase; as such, the results reflect direct RDF bindings and raw semantic triples, presented as unfiltered data outputs prior to advanced interface formatting."), style="line-height: 1.8; font-size: 1.05em; margin-bottom: 25px;"),
      
      div(class = "query-block",
          div(class = "entity-box",
              uiOutput("icon_subject"),
              selectizeInput("query_subject_type", "Subject", 
                             choices = c("Select..." = "", 
                                         "Person" = "Person", 
                                         "Document" = "Document",
                                         "Institution" = "Institution",
                                         "Movement" = "Movement",
                                         "Event" = "Event",
                                         "Location" = "Location",
                                         "Concept" = "Concept"), 
                             width = "160px")
          ),
          
          div(class = "arrow-box", 
              img(src = "icons/seta.png", height = "24px")
          ),
          
          div(class = "entity-box",
              selectizeInput("query_relation", "Predicate", 
                             choices = c("Waiting for subject..." = ""), 
                             width = "280px")
          ),
          
          div(class = "arrow-box", 
              img(src = "icons/seta.png", height = "24px")
          ),
          
          div(class = "entity-box",
              uiOutput("icon_object"),
              selectizeInput("query_object_type", "Object", 
                             choices = c("Waiting for relation..." = ""), 
                             width = "200px")
          ),
          
          tags$button(id = "run_sparql", type = "button", class = "btn action-button run-query-btn", "")
      ),
      
      hr(),
      div(style = "font-size: 0.9em; color: #888;",
          p("Advanced: You can also write a custom SPARQL query below (overrides the builder)."),
          textAreaInput("custom_sparql", NULL, rows = 3, 
                        placeholder = "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10", 
                        width = "100%")
      ),
      
      h4("Query Results", style = "font-family: 'Merriweather', serif; color: #424242; margin-top: 10px;"),
      div(style = "background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 4px; max-height: 500px; overflow-y: auto;",
          DTOutput("sparql_results")
      )
    )
  )
}