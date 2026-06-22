# -*- coding: utf-8 -*-
"""
Contrôleur API - Routage logique et extraction réseau
"""
import json
import sql_request as db
import gestionnaires as biz

DERNIER_SCAN = None

def handle_get_api(route, params, request_handler):
    global DERNIER_SCAN
    if route == "get_last_scan":
        request_handler.send_response_json({"success": True, "id_carte": DERNIER_SCAN})
        DERNIER_SCAN = None
        return True
        
    elif route == "qr_code":
        user_id = params.get('id', [''])[0]
        if user_id:
            img_bytes = biz.generate_qr_bytes(user_id)
            request_handler.send_response(200)
            request_handler.send_header('Content-Type', 'image/png')
            request_handler.send_header('Content-Length', str(len(img_bytes)))
            request_handler.end_headers()
            request_handler.wfile.write(img_bytes)
        else:
            request_handler.send_response_json({"error": "ID manquant"}, 400)
        return True

    elif route == "config":
        config_path = request_handler.root / "database" / "config.json"
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                request_handler.send_response_json({"success": True, "data": json.load(f)})
        else:
            request_handler.send_response_json({"success": False, "error": "Fichier absent"}, 404)
        return True

    elif route == "stats":
        request_handler.send_response_json(biz.get_stats_logic(lambda k, d: params.get(k, d) if k in params else d))
        return True

    elif route == "users":
        search = params.get('search', [''])[0]
        statut = params.get('statut', ['all'])[0]
        page, page_size = params.get('page', [1])[0], params.get('page_size', [12])[0]
        rows, total = db.list_users(search, statut, page, page_size)
        request_handler.send_response_json({"items": [{"id": r[0], "nom": r[2], "prenom": r[3], "statut": r[4]} for r in rows], "total": total})
        return True

    elif route == "user_info":
        scan_id = params.get('id', [''])[0]
        r = db.get_user_by_scan_id(scan_id)
        if r:
            certifs = json.loads(r[7]) if r[7] else []
            request_handler.send_response_json({"success": True, "data": {"id": r[0], "nom": r[1], "prenom": r[2], "statut": r[3], "email": r[4], "id_carte": r[5] or "", "montant": r[6] or 0.0, "certifications": certifs}})
        else:
            request_handler.send_response_json({"success": False, "error": "Inconnu"})
        return True

    elif route == "search_projects":
        query_text = params.get('q', [''])[0]
        type_filtre = params.get('type', ['all'])[0]
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # On sélectionne aussi le tuteur pour pouvoir le renvoyer à l'interface
        sql = "SELECT DISTINCT projet_nom, projet_tuteur FROM PAIEMENTS WHERE projet_nom LIKE ?"
        args = [f"%{query_text}%"]
        
        if type_filtre and type_filtre != "all" and type_filtre != "NONE":
            sql += " AND projet_type = ?"
            args.append(type_filtre)
            
        sql += " LIMIT 15"
        cursor.execute(sql, args)
        rows = cursor.fetchall()
        conn.close()
        
        # On renvoie un dictionnaire avec le nom et le tuteur pour chaque suggestion
        request_handler.send_response_json({
            "items": [{"nom": r[0], "tuteur": r[1] or ""} for r in rows if r[0]]
        })
        return True

    elif route == "payments":
        u_id = params.get('user_id', [None])[0]
        proj = params.get('project', [None])[0]
        s_user = params.get('search_user', [None])[0]
        limit = int(params.get('limit', [50])[0])
        
        raw_payments = db.get_payments(id_user=u_id, project_name=proj, limit=limit, search_user=s_user)
        
        formatted = []
        for r in raw_payments:
            formatted.append({
                "id_paiement": r[0], 
                "id_utilisateur": r[1], 
                "date": r[2], 
                "nom": r[3],
                "description": r[4], 
                "commentaire": r[5], 
                "projet_nom": r[6], 
                "projet_type": r[7],
                "projet_tuteur": r[8], 
                "numero_operation": r[9], 
                "type_mouvement": r[10], 
                "montant": r[11],
                "materiau": r[12], 
                "poids": r[13], 
                "user_nom": r[14] if r[14] else "Supprimé", 
                "user_prenom": r[15] if r[15] else "Membre", 
                "moyen_paiement": r[16]
            })
        request_handler.send_response_json({"success": True, "data": formatted})
        return True

    elif route == "export_stats_csv":
        csv_data = biz.export_stats_csv_logic()
        request_handler.send_response(200)
        request_handler.send_header('Content-Type', 'text/csv; charset=utf-8-sig')
        request_handler.send_header('Content-Disposition', 'attachment; filename="Historique_FabLab.csv"')
        request_handler.end_headers()
        request_handler.wfile.write(csv_data)
        return True

    elif route == "export_transactions_csv":
        u_id = params.get('user_id', [None])[0]
        proj = params.get('project', [None])[0]
        s_user = params.get('search_user', [None])[0]
        
        raw_payments = db.get_payments(id_user=u_id, project_name=proj, limit=10000, search_user=s_user)
        
        formatted = []
        for r in raw_payments:
            formatted.append({
                "id_paiement": r[0], 
                "id_utilisateur": r[1], 
                "date": r[2], 
                "nom": r[3],
                "description": r[4], 
                "commentaire": r[5], 
                "projet_nom": r[6], 
                "projet_type": r[7],
                "projet_tuteur": r[8], 
                "numero_operation": r[9], 
                "type_mouvement": r[10], 
                "montant": r[11],
                "materiau": r[12], 
                "poids": r[13], 
                "user_nom": r[14] if r[14] else "Supprimé", 
                "user_prenom": r[15] if r[15] else "Membre", 
                "moyen_paiement": r[16]
            })
            
        csv_data = biz.export_transactions_csv_logic(formatted)
        request_handler.send_response(200)
        request_handler.send_header('Content-Type', 'text/csv; charset=utf-8-sig')
        request_handler.send_header('Content-Disposition', 'attachment; filename="Transactions_FabLab.csv"')
        request_handler.end_headers()
        request_handler.wfile.write(csv_data)
        return True

def handle_post_api(route, request_handler):
    global DERNIER_SCAN
    if route == "import_users_excel":
        content_length = int(request_handler.headers.get('Content-Length', 0))
        raw_body = request_handler.rfile.read(content_length)
        res = biz.import_users_excel_logic(raw_body, request_handler.headers.get('Content-Type', ''))
        request_handler.send_response_json(res, res.get('code', 200))
        return True

    elif route == "rgpd_maintenance_annuelle":
        anon, purges = db.execute_rgpd_maintenance()
        request_handler.send_response_json({"success": True, "message": f"Maintenance réussie ! {anon} accès anonymisés et {purges} profils obsolètes supprimés."})
        return True

    data = request_handler.parse_json_body()
    if data is None: return True

    if route == "scan":
        DERNIER_SCAN = data.get('user_id')
        request_handler.send_response_json({"success": True, "message": "Scan mémorisé."})
    elif route == "add_user":
        res = biz.add_user_logic(data)
        request_handler.send_response_json(res, res.get('code', 200))
    elif route == "add_entry":
        uid = data.get('user_id')
        motif = data.get('type_projet', 'N/A')
        zone = data.get('zone_travail', 'N/A')
        comment = data.get('commentaire', '')
        
        db.add_entry(uid, motif, zone, comment)
        
        user_info = db.research_user_by_id(uid)
        prenom = user_info[1] if user_info else "Visiteur"
        
        request_handler.send_response_json({"success": True, "prenom": prenom, "message": "Entrée enregistrée avec succès."})
    elif route == "update_user":
        db.update_user(data.get('id'), data.get('nom'), data.get('prenom'), data.get('statut'), data.get('email'), data.get('certifications'))
        if 'id_carte' in data: db.link_id_carte(data.get('id'), data.get('id_carte'))
        request_handler.send_response_json({"success": True, "message": "Profil mis à jour !"})
    elif route == "add_payment":
        db.add_payment(
            data.get('user_id'), data.get('nom'), data.get('description'), data.get('commentaire'),
            data.get('projet_nom'), data.get('projet_type'), data.get('projet_tuteur'), data.get('numero_operation'),
            data.get('type_mouvement'), data.get('montant'), data.get('materiau'), data.get('poids'), data.get('moyen_paiement')
        )
        request_handler.send_response_json({"success": True, "message": "Paiement enregistré avec succès !"})
        return True

    return False