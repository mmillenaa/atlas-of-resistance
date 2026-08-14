import csv
import re
import os

# Prefixos do TTL
PREFIX = """
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix atlas: <http://example.org/atlas/> .
"""

def clean_uri(valor):
    """Limpa valor para usar como URI."""
    if not valor or valor.strip() == "":
        return None
    v = str(valor).strip()
    # Substitui espaços e caracteres especiais por _
    v = re.sub(r'[^a-zA-Z0-9_]', '_', v)
    v = re.sub(r'_+', '_', v)  # Remove underlines duplicados
    v = v.strip('_')
    return v

def clean_literal(valor):
    """Escapa caracteres especiais para string literal."""
    if not valor or valor.strip() == "":
        return ""
    v = str(valor).strip()
    v = v.replace('\\', '\\\\')
    v = v.replace('"', '\\"')
    v = v.replace('\n', ' ').replace('\r', ' ')
    v = re.sub(r'\s+', ' ', v)
    return v

def ler_csv(nome_arquivo):
    """Lê CSV e retorna lista de dicionários."""
    caminho = os.path.join(os.path.dirname(__file__), nome_arquivo)
    if not os.path.exists(caminho):
        print(f"AVISO: Arquivo {nome_arquivo} não encontrado. Pulando.")
        return []
    with open(caminho, 'r', encoding='utf-8') as f:
        leitor = csv.DictReader(f, delimiter=',')
        return list(leitor)

def gerar_ttl():
    triples = [PREFIX, ""]
    contador = 0
    
    # ------------------------------------------------------------
    # 1. ENTIDADES: Persons
    # ------------------------------------------------------------
    dados = ler_csv('Persons.csv')
    print(f"Persons.csv: {len(dados)} linhas")
    for row in dados:
        pid = clean_uri(row.get('PersonID', ''))
        if not pid:
            continue
        triples.append(f"atlas:{pid} rdf:type atlas:Person .")
        nome = clean_literal(row.get('Label', row.get('Name', '')))
        if nome:
            triples.append(f'atlas:{pid} rdfs:label "{nome}"@en .')
        # personID como literal
        pid_lit = clean_literal(row.get('PersonID', ''))
        if pid_lit:
            triples.append(f'atlas:{pid} atlas:personID "{pid_lit}"^^xsd:string .')
        contador += 1
    
    # ------------------------------------------------------------
    # 2. ENTIDADES: Documents
    # ------------------------------------------------------------
    dados = ler_csv('Documents.csv')
    print(f"Documents.csv: {len(dados)} linhas")
    for row in dados:
        did = clean_uri(row.get('DocumentID', ''))
        if not did:
            continue
        triples.append(f"atlas:{did} rdf:type atlas:Document .")
        titulo = clean_literal(row.get('Title', row.get('Name', '')))
        if titulo:
            triples.append(f'atlas:{did} rdfs:label "{titulo}"@en .')
        contador += 1
    
    # ------------------------------------------------------------
    # 3. ENTIDADES: Institutions
    # ------------------------------------------------------------
    dados = ler_csv('Institutions.csv')
    print(f"Institutions.csv: {len(dados)} linhas")
    for row in dados:
        iid = clean_uri(row.get('InstitutionID', ''))
        if not iid:
            continue
        triples.append(f"atlas:{iid} rdf:type atlas:Institution .")
        nome = clean_literal(row.get('Label', row.get('Name', '')))
        if nome:
            triples.append(f'atlas:{iid} rdfs:label "{nome}"@pt .')
        contador += 1
    
    # ------------------------------------------------------------
    # 4. ENTIDADES: Movements
    # ------------------------------------------------------------
    dados = ler_csv('Movements.csv')
    print(f"Movements.csv: {len(dados)} linhas")
    for row in dados:
        mid = clean_uri(row.get('MovementID', ''))
        if not mid:
            continue
        triples.append(f"atlas:{mid} rdf:type atlas:Movement .")
        nome = clean_literal(row.get('Label', row.get('Name', '')))
        if nome:
            triples.append(f'atlas:{mid} rdfs:label "{nome}"@pt .')
        contador += 1
    
    # ------------------------------------------------------------
    # 5. ENTIDADES: Events
    # ------------------------------------------------------------
    dados = ler_csv('Events.csv')
    print(f"Events.csv: {len(dados)} linhas")
    for row in dados:
        eid = clean_uri(row.get('EventID', ''))
        if not eid:
            continue
        triples.append(f"atlas:{eid} rdf:type atlas:Event .")
        nome = clean_literal(row.get('Label', row.get('Name', row.get('EventType', ''))))
        if nome:
            triples.append(f'atlas:{eid} rdfs:label "{nome}"@en .')
        contador += 1
    
    # ------------------------------------------------------------
    # 6. ENTIDADES: Locations
    # ------------------------------------------------------------
    dados = ler_csv('Locations.csv')
    print(f"Locations.csv: {len(dados)} linhas")
    for row in dados:
        lid = clean_uri(row.get('LocationID', ''))
        if not lid:
            continue
        triples.append(f"atlas:{lid} rdf:type atlas:Location .")
        nome = clean_literal(row.get('Label', row.get('Name', '')))
        if nome:
            triples.append(f'atlas:{lid} rdfs:label "{nome}"@en .')
        contador += 1
    
    # ------------------------------------------------------------
    # 7. ENTIDADES: Concepts
    # ------------------------------------------------------------
    dados = ler_csv('Concepts.csv')
    print(f"Concepts.csv: {len(dados)} linhas")
    for row in dados:
        cid = clean_uri(row.get('ConceptID', ''))
        if not cid:
            continue
        triples.append(f"atlas:{cid} rdf:type atlas:Concept .")
        nome = clean_literal(row.get('Label', row.get('Name', '')))
        if nome:
            triples.append(f'atlas:{cid} rdfs:label "{nome}"@en .')
        contador += 1
    
    # ------------------------------------------------------------
    # RELAÇÕES
    # ------------------------------------------------------------
    
    # 8. DocumentPersons.csv
    dados = ler_csv('DocumentPersons.csv')
    print(f"DocumentPersons.csv: {len(dados)} linhas")
    for row in dados:
        doc = clean_uri(row.get('DocumentID', ''))
        person = clean_uri(row.get('PersonID', ''))
        pred = clean_uri(row.get('RelationshipType', ''))
        if doc and person and pred:
            triples.append(f"atlas:{doc} atlas:{pred} atlas:{person} .")
            contador += 1
    
    # 9. DocumentEvents.csv
    dados = ler_csv('DocumentEvents.csv')
    print(f"DocumentEvents.csv: {len(dados)} linhas")
    for row in dados:
        doc = clean_uri(row.get('DocumentID', ''))
        event = clean_uri(row.get('EventID', ''))
        if doc and event:
            triples.append(f"atlas:{doc} atlas:describes atlas:{event} .")
            contador += 1
    
    # 10. DocumentLocations.csv
    dados = ler_csv('DocumentLocations.csv')
    print(f"DocumentLocations.csv: {len(dados)} linhas")
    for row in dados:
        doc = clean_uri(row.get('DocumentID', ''))
        loc = clean_uri(row.get('PlaceID', ''))
        pred = clean_uri(row.get('RelationType', ''))
        if doc and loc and pred:
            triples.append(f"atlas:{doc} atlas:{pred} atlas:{loc} .")
            contador += 1
    
    # 11. EventPersons.csv
    dados = ler_csv('EventPersons.csv')
    print(f"EventPersons.csv: {len(dados)} linhas")
    for row in dados:
        event = clean_uri(row.get('EventID', ''))
        person = clean_uri(row.get('PersonID', ''))
        pred = clean_uri(row.get('Role', ''))
        if event and person and pred:
            triples.append(f"atlas:{person} atlas:{pred} atlas:{event} .")
            contador += 1
    
    # 12. EventConcepts.csv
    dados = ler_csv('EventConcepts.csv')
    print(f"EventConcepts.csv: {len(dados)} linhas")
    for row in dados:
        event = clean_uri(row.get('EventID', ''))
        concept = clean_uri(row.get('ConceptID', ''))
        pred = clean_uri(row.get('RelationType', ''))
        if event and concept and pred:
            triples.append(f"atlas:{event} atlas:{pred} atlas:{concept} .")
            contador += 1
    
    # 13. EventActors.csv
    dados = ler_csv('EventActors.csv')
    print(f"EventActors.csv: {len(dados)} linhas")
    for row in dados:
        event = clean_uri(row.get('EventID', ''))
        actor = clean_uri(row.get('ActorID', ''))
        pred = clean_uri(row.get('Role', ''))
        if event and actor and pred:
            triples.append(f"atlas:{event} atlas:{pred} atlas:{actor} .")
            contador += 1
    
    # 14. PersonInstitutions.csv
    dados = ler_csv('PersonInstitutions.csv')
    print(f"PersonInstitutions.csv: {len(dados)} linhas")
    for row in dados:
        person = clean_uri(row.get('PersonID', ''))
        inst = clean_uri(row.get('InstitutionID', ''))
        pred = clean_uri(row.get('Role', ''))
        if person and inst and pred:
            triples.append(f"atlas:{person} atlas:{pred} atlas:{inst} .")
            contador += 1
    
    # 15. PersonMovements.csv
    dados = ler_csv('PersonMovements.csv')
    print(f"PersonMovements.csv: {len(dados)} linhas")
    for row in dados:
        person = clean_uri(row.get('PersonID', ''))
        mov = clean_uri(row.get('MovementID', ''))
        pred = clean_uri(row.get('Role', ''))
        if person and mov and pred:
            triples.append(f"atlas:{person} atlas:{pred} atlas:{mov} .")
            contador += 1
    
    # 16. EventDetails.csv (opcional)
    dados = ler_csv('EventDetails.csv')
    print(f"EventDetails.csv: {len(dados)} linhas")
    for row in dados:
        event = clean_uri(row.get('EventID', ''))
        det_type = clean_uri(row.get('DetailType', ''))
        det_val = clean_literal(row.get('DetailValue', ''))
        if event and det_type and det_val:
            triples.append(f'atlas:{event} atlas:{det_type} "{det_val}"@en .')
            contador += 1
    
    # Escreve arquivo
    with open('data.ttl', 'w', encoding='utf-8') as f:
        f.write('\n'.join(triples))
    
    print(f"\n✅ TTL gerado com sucesso em data.ttl")
    print(f"Total de triplas geradas: {contador}")
    print(f"Total de linhas no arquivo: {len(triples)}")

if __name__ == "__main__":
    gerar_ttl()