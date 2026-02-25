code plant uml : 

@startuml

entity UTILISATEURS {
  + id : int <<PK>>
  -- 
  nom : string 
  prénom : string 
  id_carte : string 
  status : string 
  formation_3d : bool 
  formation_laser : bool 
  formation_brodeuse : bool 
  commentaire : string 
}

entity ENTREES {
  + id : int <<PK>>
  --  
  id_utilisateur : int <<FK>> 
  date : date 
  type_projet : string 
  zone_travail : string 
  commentaire : string 
  
}



@enduml