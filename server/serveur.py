# -*- coding: utf-8 -*-
"""
Serveur FabLab - Routeur de base HTTP & Démarrage
"""
import http.server
import socketserver
import json
from urllib.parse import urlparse, parse_qs
from pathlib import Path 

# Importation des sous-fichiers locaux du dossier /server
import routes_api
import sql_request as db

PORT_SERVEUR = 8000

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    root = Path(__file__).resolve().parent.parent
    static_dir = root / 'client'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=self.static_dir, **kwargs)

    def send_response_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        try:
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            print(f"Erreur d'écriture réseau : {e}")

    def parse_json_body(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            return json.loads(self.rfile.read(length).decode('utf-8')) if length > 0 else {}
        except Exception:
            self.send_response_json({"error": "JSON invalide"}, 400)
            return None

    def do_GET(self):
        parsed = urlparse(self.path)
        info = parsed.path.strip('/').split('/')
        params = parse_qs(parsed.query)
        
        if len(info) > 1 and info[0] == "api":
            if routes_api.handle_get_api(info[1], params, self): return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        info = parsed.path.strip('/').split('/')
        
        if len(info) > 1 and info[0] == "api":
            if routes_api.handle_post_api(info[1], self): return
        self.send_response_json({"error": "Route invalide"}, 404)
            
    def do_DELETE(self):
        parsed = urlparse(self.path)
        info = parsed.path.strip('/').split('/')
        if len(info) > 2 and info[0] == "api" and info[1] == "user":
            if db.delete_user(info[2]):
                self.send_response_json({"success": True, "message": "Utilisateur supprimé."})
            else:
                self.send_response_json({"success": False, "error": "Utilisateur introuvable."}, 404)
        else:
            self.send_response_json({"error": "Route DELETE invalide"}, 404)

if __name__ == "__main__":
    print("=== Configuration du Serveur Modulaire ===")
    db.init_database()
    print(f"Serveur actif sur le port {PORT_SERVEUR} -> http://localhost:{PORT_SERVEUR}/")
    with socketserver.TCPServer(("", PORT_SERVEUR), RequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêt du système.")