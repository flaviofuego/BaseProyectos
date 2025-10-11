---
applyTo: '**'
---
trata siempre de usar el archivo makefile para compilar el proyecto. Si no existe un makefile, usa los comando de docker para usar los diferentes contenedores o servicioes que el proyecto pueda tener.
Si no existe un makefile ni docker, usa los comandos de compilación que el proyecto tenga documentados en su README.md o en la documentación oficial del proyecto.

al momento de crear pruebas para el cambio, ejecuta la prueba creada y si el resultado es exitoso, elimina el archivo de prueba creado.

no crees archivos .md finales después de cada cambio, a menos que el proyecto lo requiera. 

Trata de siempre tener en cuenta la modularidad del código y la reutilización del mismo al momento de hacer un cambio o agregar una nueva funcionalidad.

si el proyecto tiene un archivo de configuración para el entorno de desarrollo, úsalo.

