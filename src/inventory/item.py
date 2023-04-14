from __future__ import annotations

class Item:

    ID = 1

    def __init__(self, nombre: str, valor: int) -> None:
        self.__id = Item.ID
        self.__nombre = nombre
        self.__valor = valor

        Item.ID += 1

    def get_nombre(self) -> str:
        return self.__nombre
    
    def get_valor(self) -> int:
        return self.__valor
