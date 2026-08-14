ui_about <- function() {
  fluidPage(
    h3("Research outline", style = "font-family: 'Merriweather', serif; color: #424242; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 25px;"),
    p(HTML("This platform is intrinsically linked to the doctoral research project <i>Working-class movement in the resistance to the Civil-Military Dictatorship: struggles for education and educational initiatives of the Metallurgical Trade Union Opposition of São Paulo (1960–1988)</i>, supervised by Prof. Dr. Carmen Sylvia Vidigal Moraes (2021–). By mapping semantic relationships between individuals, trade unions and the state’s apparatus of repression into a comprehensive knowledge graph, the platform provides a foundational resource for researchers investigating the historical evolution of legal categories related to state violence and human-rights violations. Through semantic interoperability and open data access, the initiative supports efforts toward memory, truth and transitional justice for lives lost and affected by Latin American authoritarian regimes."), style="line-height: 1.8; font-size: 1.05em;"),
    p(HTML("The project is currently ongoing. While the primary inclusion criterion for this knowledge graph is currently the individuals' affiliation with the Metallurgical Trade Union Opposition of São Paulo—featuring emblematic figures involved in historic labour struggles and assassinations of great national repercussion—it is anticipated that the scope will be expanded in the future to encompass other resistance actors, social movements, and related institutions."), style="line-height: 1.8; font-size: 1.05em; margin-bottom: 25px;"),
    div(style = "background-color: #ffffff; padding: 25px; border-left: 4px solid #9D2235; box-shadow: 0 2px 6px rgba(0,0,0,0.08); margin-bottom: 25px; border-radius: 2px;",
        h4("Developer", style = "font-family: 'Merriweather', serif; color: #9D2235; margin-top: 0;"),
        p(HTML("<b>Millena Miranda Franco</b> is a PhD candidate in Education and a Law student at the University of São Paulo (USP). She holds a Master's degree in the History of Education from USP, with an Erasmus+ mobility period at the Universität Potsdam, Germany. She is currently a visiting researcher at the São Paulo Law School of the Getulio Vargas Foundation (FGV DIREITO SP), where she develops the FAPESP-funded project <i>Organização e disponibilização pública de acervo documental envolvendo violência de estado</i> (process 25/11544-9) under the supervision of Prof. Dr. Maíra Rocha Machado."), style="line-height: 1.6; margin-bottom: 15px;"),
        div(style = "margin-top: 20px;",
            a(href="http://lattes.cnpq.br/3848824456283762", target="_blank", style="text-decoration: none; margin-right: 12px;",
              span("Lattes CV", style="background-color: #9D2235; color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-family: Roboto; font-weight: bold;")),
            a(href="https://bv.fapesp.br/pt/pesquisador/743339/millena-miranda-franco/", target="_blank", style="text-decoration: none; margin-right: 12px;",
              span("BV FAPESP", style="background-color: #9D2235; color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-family: Roboto; font-weight: bold;")),
            a(href="https://orcid.org/0000-0002-0292-0797", target="_blank", style="text-decoration: none; margin-right: 12px;",
              span("ORCID", style="background-color: #9D2235; color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-family: Roboto; font-weight: bold;")),
            a(href="https://github.com/mmillenaa/", target="_blank", style="text-decoration: none;",
              span("GitHub", style="background-color: #9D2235; color: white; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-family: Roboto; font-weight: bold;"))
        )
    )
  )
}