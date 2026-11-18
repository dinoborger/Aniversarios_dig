"""Notificações de aniversários via Microsoft Graph, com OAuth2 app-only."""
import csv
import os
import sys
from datetime import datetime, date, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import msal
import requests

DESTINATARIOS = [
    'luis.f.rodrigues@madeira.gov.pt',
    'fabio.rr.marques@madeira.gov.pt',
    'fabio.gomes@madeira.gov.pt',
    'noel.perdigao@madeira.gov.pt',
    'vitor.jorge@madeira.gov.pt',
    'vitor.hn.goncalves@madeira.gov.pt',
    'dino.ms.nunes@madeira.gov.pt',
]
TZ = ZoneInfo('Europe/Lisbon')


def aniversario_no_ano(nascimento, ano):
    try:
        return nascimento.replace(year=ano)
    except ValueError:  # 29 de fevereiro: política adotada = 28 de fevereiro
        return date(ano, 2, 28)


def dias_para_aniversario(nascimento, hoje):
    proximo = aniversario_no_ano(nascimento, hoje.year)
    if proximo < hoje:
        proximo = aniversario_no_ano(nascimento, hoje.year + 1)
    return (proximo - hoje).days


def recolher_avisos(hoje):
    caminho = Path(__file__).parent / 'data' / 'aniversarios.csv'
    avisos = []
    with caminho.open(encoding='utf-8-sig', newline='') as ficheiro:
        for linha in csv.DictReader(ficheiro):
            if linha['ativo'].strip().lower() not in ('sim', 'true', '1'):
                continue
            nascimento = date.fromisoformat(linha['data_nascimento'].strip())
            dias = dias_para_aniversario(nascimento, hoje)
            if dias in (7, 1, 0):
                avisos.append((linha['nome'].strip(), dias))
    return avisos


def enviar_graph(assunto, corpo):
    tenant = os.environ['AZURE_TENANT_ID']
    client = os.environ['AZURE_CLIENT_ID']
    secret = os.environ['AZURE_CLIENT_SECRET']
    remetente = os.environ['MAIL_SENDER']
    app = msal.ConfidentialClientApplication(
        client, authority=f'https://login.microsoftonline.com/{tenant}',
        client_credential=secret,
    )
    token = app.acquire_token_for_client(scopes=['https://graph.microsoft.com/.default'])
    if 'access_token' not in token:
        raise RuntimeError('Falha de autenticação Microsoft Graph: ' + token.get('error', 'erro desconhecido'))
    mensagem = {
        'message': {
            'subject': assunto,
            'body': {'contentType': 'Text', 'content': corpo},
            'toRecipients': [{'emailAddress': {'address': e}} for e in DESTINATARIOS],
        },
        'saveToSentItems': True,
    }
    url = f'https://graph.microsoft.com/v1.0/users/{requests.utils.quote(remetente, safe="")}/sendMail'
    resposta = requests.post(url, json=mensagem, headers={
        'Authorization': 'Bearer ' + token['access_token'],
        'Content-Type': 'application/json',
    }, timeout=30)
    resposta.raise_for_status()
    print('Pedido de envio aceite pelo Microsoft Graph (HTTP 202).')


def main():
    agora = datetime.now(TZ)
    if os.getenv('ENFORCE_HOUR', 'true').lower() == 'true' and agora.hour != 9:
        print(f'Fora da hora programada em Lisboa ({agora:%H:%M}); sem envio.')
        return
    avisos = recolher_avisos(agora.date())
    if not avisos:
        print('Sem aniversários para notificar hoje.')
        return
    linhas = []
    for nome, dias in avisos:
        quando = 'hoje' if dias == 0 else ('amanhã' if dias == 1 else 'daqui a 7 dias')
        linhas.append(f'- {nome}: {quando}')
    assunto = f'Avisos de aniversários — {agora:%d/%m/%Y}'
    corpo = 'Avisos automáticos de aniversário:\n\n' + '\n'.join(linhas)
    if os.getenv('DRY_RUN', 'true').lower() == 'true':
        print('SIMULAÇÃO — nenhum email enviado.\n' + assunto + '\n' + corpo)
        return
    enviar_graph(assunto, corpo)


if __name__ == '__main__':
    try:
        main()
    except Exception as erro:
        print(f'Erro: {erro}', file=sys.stderr)
        sys.exit(1)
