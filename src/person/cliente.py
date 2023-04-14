from __future__ import annotations
from typing import Dict, List

#from inventory.item import Item
#from inventory.pedido import Pedido

class Cliente:
    
    def __init__(self, nombre: str, pedidos: List["Pedido"] = None) -> None:
        self.__nombre = nombre
        self.__pedidos = [] if pedidos is None else pedidos

    def get_nombre(self) -> str:
        return self.__nombre
    
    def get_pedidos(self) -> List["Pedido"]:
        return self.__pedidos
    
    def add_pedido(self, pedido: "Pedido") -> bool:
        self.__pedidos.append(pedido)
        return True
    
    def get_frecuencia_pedidos(self, items: List[str]) -> Dict[str, int]:
        frecuencia_pedidos = {}

        for item in items:
            frecuencia_pedidos[item] = 0

        for pedido in self.__pedidos:
            if pedido.__class__.__name__ == 'PedidoOnLine':
                for item in pedido.get_items():
                    frecuencia_pedidos[item.get_nombre()] += 1

        return frecuencia_pedidos