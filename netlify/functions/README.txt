ART HOME - VARIANTĂ NETLIFY ORGANIZATĂ

Ce include:
- carduri fără descriere
- spațiere mai bună între titlu, preț, magazin și butoane
- cod organizat în:
  - assets/css/style.css
  - assets/js/app.js
  - netlify/functions/products.js
  - index.html
  - product.html

Unde modifici categoriile:
- netlify/functions/products.js
- caută funcția inferCategory(title, description)

Unde modifici designul:
- assets/css/style.css

Unde modifici cardurile:
- assets/js/app.js
- caută funcția renderProductCard(product)

Deploy Netlify:
1. Dezarhivează ZIP-ul.
2. Pune logo.jpg în folderul principal.
3. Urcă tot folderul pe Netlify.
4. Test API:
   /.netlify/functions/products?page=1&limit=5
