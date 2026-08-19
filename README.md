# Agendador de Horários

Site simples, em português, para a equipe marcar disponibilidade semanal (segunda a domingo, das 9h às 21h, em blocos de 1h) — sem precisar escolher datas específicas. Funciona como o [when2meet](https://www.when2meet.com/), mas os dados ficam salvos em uma **Planilha Google**.

## Como funciona

- `index.html`, `style.css`, `script.js` — o site (front-end), sem dependências externas.
- `apps-script/Code.gs` — código que roda dentro do Google Apps Script e serve de backend, lendo e escrevendo na planilha.

## Passo a passo para configurar

### 1. Criar a planilha e o backend

1. Crie uma nova Planilha Google ([sheets.new](https://sheets.new)).
2. No menu, vá em **Extensões > Apps Script**.
3. Apague o conteúdo do arquivo `Code.gs` que abrir e cole todo o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs) deste projeto.
4. Salve o projeto (ícone de disquete).
5. Clique em **Implantar > Nova implantação**.
   - Tipo: **App da Web**
   - Executar como: **Eu** (sua conta)
   - Quem pode acessar: **Qualquer pessoa**
6. Clique em **Implantar** e autorize as permissões pedidas.
7. Copie a **URL do app da Web** gerada (algo como `https://script.google.com/macros/s/.../exec`).

A planilha vai ganhar automaticamente uma aba chamada **Respostas** na primeira vez que alguém salvar ou consultar dados.

### 2. Conectar o site à planilha

1. Abra o arquivo [`script.js`](script.js).
2. Na primeira linha de configuração, troque:
   ```js
   const SCRIPT_URL = 'COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT';
   ```
   pela URL copiada no passo anterior.

### 3. Publicar o site

Qualquer hospedagem de arquivos estáticos funciona, por exemplo:

- **GitHub Pages**: suba os arquivos para um repositório e ative Pages nas configurações.
- **Netlify / Vercel**: arraste a pasta do projeto na interface deles.
- **Uso local/teste**: basta abrir o `index.html` direto no navegador.

## Como a equipe usa

1. A pessoa abre o site, vai na aba **"Adicionar / editar meus horários"**.
2. Digita o nome e clica/arrasta sobre os quadrados para marcar os horários livres.
3. Clica em **Salvar disponibilidade**.
4. Na aba **"Disponibilidade do grupo"**, todos veem o mapa de calor combinado — quanto mais escuro o verde, mais gente está disponível naquele horário. Passar o mouse sobre um quadrado mostra quem está livre.
5. Para editar horários já enviados, basta clicar no próprio nome na lista "Quem já respondeu" — os horários salvos são carregados de volta no editor.

## Observações

- Não há login: qualquer pessoa com o link pode responder. Se dois nomes iguais forem usados, os horários mais recentes substituem os anteriores (útil para reeditar a própria resposta).
- Os dias da semana são fixos (Segunda a Domingo) e não representam uma data específica — a ideia é capturar a disponibilidade recorrente/semanal da equipe.
