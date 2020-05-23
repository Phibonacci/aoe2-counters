
#!python3

import http.server
import socketserver

PORT = 8080

handler = http.server.SimpleHTTPRequestHandler
handler.extensions_map = {
    '.html': 'text/html',
    '.png':  'image/png',
    '.jpg':  'image/jpg',
    '.css':	 'text/css',
    '.js':	 'application/javascript',
    '.mjs':	 'application/javascript',
    '':      'application/octet-stream',
}

httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)

print("Starting HTTP server on port", PORT)
httpd.serve_forever()
