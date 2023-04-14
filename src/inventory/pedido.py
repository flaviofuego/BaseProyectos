from __future__ import annotations
from abc import ABC
from typing import Any, List

from inventory.item import Item
from person.cliente import Cliente

class Pedido(ABC):

    def __init__(self, cliente: "Cliente", items: List["Item"] = []) -> None:
        self._cliente = cliente
        self._items = items
        self._cliente.add_pedido(self)

    def get_cliente(self) -> "Cliente":
        return self._cliente
    
    def get_items(self) -> List["Item"]:
        return self._items


class PedidoOnLine(Pedido):

    def __init__(self, email: str, **kwargs: Any) -> None:
        self.__email = email
        super().__init__(**kwargs)

    def get_email(self) -> str:
        return self.__email


class PedidoTelefono(Pedido):

    def __init__(self, telefono: str, **kwargs: Any) -> None:
        self.__telefono = telefono
        super().__init__(**kwargs)

    def get_telefono(self) -> str:
        return self.__telefono