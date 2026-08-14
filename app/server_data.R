# server_data.R

# ---- Main data table ----
output$tabela_dados <- renderDT({
  df_table <- edges %>% rename(Individual = from, Institution = to, Label = label)
  cols_existentes <- names(df_table)
  ordem_desejada <- c("Individual", "Label", "Institution")
  if("EvidenceText_EN" %in% cols_existentes) ordem_desejada <- c(ordem_desejada, "EvidenceText_EN")
  if("EvidenceText_ORIG" %in% cols_existentes) ordem_desejada <- c(ordem_desejada, "EvidenceText_ORIG")
  if("StartDate" %in% cols_existentes) ordem_desejada <- c(ordem_desejada, "StartDate")
  if("EndDate" %in% cols_existentes) ordem_desejada <- c(ordem_desejada, "EndDate")
  
  df_table <- df_table %>% select(all_of(intersect(ordem_desejada, cols_existentes)), everything())
  datatable(df_table, options = list(pageLength = 15, scrollX = TRUE), rownames = FALSE) %>% formatStyle('EvidenceText_EN', class = 'destaque-evidencia')
})