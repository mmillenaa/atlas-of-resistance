server <- function(input, output, session) {
  # 1. Source all files first
  source("server_network.R", local = TRUE)
  source("server_geography.R", local = TRUE)
  source("server_legal.R", local = TRUE)
  source("server_assistant.R", local = TRUE)
  source("server_data.R", local = TRUE)
  source("server_cosmov.R", local = TRUE)
  
  # 2. Call the assistant function so its logic actually runs!
  server_assistant(input, output, session)
  server_cosmov(input, output, session)
  
  # Note: If your other server_*.R files also use anonymous functions, 
  # you will need to name and call them here exactly like we did above.
}