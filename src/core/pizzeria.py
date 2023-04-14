from __future__ import annotations
from typing import List

from inventory.item import Item
from inventory.pedido import Pedido
from person.cliente import Cliente

class Pizzeria:

    def __init__(
        self, 
        nombre: str, 
        clientes: List["Cliente"] = [], 
        items: List["Item"] = [],
        pedidos: List["Pedido"] = []
    ) -> None:
        
        self.__nombre = nombre
        self.__clientes = clientes
        self.__items = items
        self.__pedidos = pedidos

    def get_nombre(self) -> str:
        return self.__nombre
    
    def get_clientes(self) -> List["Cliente"]:
        return self.__clientes
    
    def get_items(self) -> List["Item"]:
        return self.__items
    
    def get_pedidos(self) -> List["Pedido"]:
        return self.__pedidos
    
    def add_cliente(self, cliente: "Cliente") -> bool:
        self.__clientes.append(cliente)
        return True
    
    def add_item(self, item: "Item") -> bool:
        self.__items.append(item)
        return True
    
    def add_pedido(self, pedido: "Pedido") -> bool:
        self.__pedidos.append(pedido)
        return True
    
    def get_cliente(self, index: int) -> "Cliente":
        return self.__clientes[index]
    
    def get_item(self, index) -> "Item":
        return self.__items[index]
    
    def calc_prod_mas_vendido_cliente(self, num_cliente: int) -> int:
        items = [item.get_nombre() for item in self.__items]
        frecuencia_pedidos = self.__clientes[num_cliente].get_frecuencia_pedidos(items)

        for nombre, frecuencia in frecuencia_pedidos.items():
            print(f'El producto {nombre} se vendio {frecuencia}')

        if sum(frecuencia_pedidos.values()) > 0:
            item_name = max(frecuencia_pedidos, key = frecuencia_pedidos.get)
            for item in self.__items:
                if item.get_nombre() == item_name:
                    return self.__items.index(item)
        else:
            return -1