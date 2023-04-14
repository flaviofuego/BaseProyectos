from __future__ import annotations

from core.pizzeria import Pizzeria
from inventory.item import Item
from inventory.pedido import PedidoOnLine, PedidoTelefono
from person.cliente import Cliente

def main() -> None:
    # Creando la clase principal
    pizzeria = Pizzeria('La Bota')

    # Creando los items
    pizzeria.add_item(Item('Lasagna', 20000))
    pizzeria.add_item(Item('Pizza hawaiana', 15000))
    pizzeria.add_item(Item('Calzone', 12500))
    pizzeria.add_item(Item('Pasta napolitana', 17200))
    pizzeria.add_item(Item('Raviolis', 2200))

    # Creando los clientes
    pizzeria.add_cliente(Cliente('Pedro'))
    pizzeria.add_cliente(Cliente('Plutarco'))
    pizzeria.add_cliente(Cliente('Carolina'))
    pizzeria.add_cliente(Cliente('Lina'))
    pizzeria.add_cliente(Cliente('Ana'))

    # Creando los pedidos

    # Pedido 1
    items_temp = []
    items_temp.append(pizzeria.get_item(0))
    items_temp.append(pizzeria.get_item(0))
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(3))

    pizzeria.add_pedido(PedidoTelefono(
        cliente = pizzeria.get_cliente(0), 
        telefono = '3001111110', 
        items = items_temp
    ))

    # Pedido 2
    items_temp = []
    items_temp.append(pizzeria.get_item(1))
    items_temp.append(pizzeria.get_item(0))
    items_temp.append(pizzeria.get_item(3))
    items_temp.append(pizzeria.get_item(3))

    pizzeria.add_pedido(PedidoTelefono(
        cliente = pizzeria.get_cliente(1), 
        telefono = '3001111111', 
        items = items_temp
    ))

    # Pedido 3
    items_temp = []
    items_temp.append(pizzeria.get_item(1))
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(3))
    items_temp.append(pizzeria.get_item(4))

    pizzeria.add_pedido(PedidoOnLine(
        cliente = pizzeria.get_cliente(2),
        email = 'caro@latinmail.com',
        items = items_temp
    ))

    # Pedido 4
    items_temp = []
    items_temp.append(pizzeria.get_item(0))
    items_temp.append(pizzeria.get_item(1))
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(4))

    pizzeria.add_pedido(PedidoOnLine(
        cliente = pizzeria.get_cliente(3),
        email = 'lina@altavista.com',
        items = items_temp
    ))

    # Pedido 5
    items_temp = []
    items_temp.append(pizzeria.get_item(4))
    items_temp.append(pizzeria.get_item(4))
    items_temp.append(pizzeria.get_item(4))
    items_temp.append(pizzeria.get_item(4))

    pizzeria.add_pedido(PedidoOnLine(
        cliente = pizzeria.get_cliente(3),
        email = 'lina@altavista.com',
        items = items_temp
    ))

    # Pedido 6
    items_temp = []
    items_temp.append(pizzeria.get_item(4))
    items_temp.append(pizzeria.get_item(4))
    items_temp.append(pizzeria.get_item(4))
    items_temp.append(pizzeria.get_item(4))

    pizzeria.add_pedido(PedidoOnLine(
        cliente = pizzeria.get_cliente(0),
        email = 'pedro@metacrawler.com',
        items = items_temp
    ))

    # Pedido 7
    items_temp = []
    items_temp.append(pizzeria.get_item(1))
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(3))
    items_temp.append(pizzeria.get_item(1))

    pizzeria.add_pedido(PedidoOnLine(
        cliente = pizzeria.get_cliente(0),
        email = 'pedro@metacrawler.com',
        items = items_temp
    ))

    # Pedido 8
    items_temp = []
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(2))

    pizzeria.add_pedido(PedidoOnLine(
        cliente = pizzeria.get_cliente(1),
        email = 'plutarco@terra.com.co',
        items = items_temp
    ))

    # Pedido 9
    items_temp = []
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(3))
    items_temp.append(pizzeria.get_item(2))
    items_temp.append(pizzeria.get_item(2))

    pizzeria.add_pedido(PedidoOnLine(
        cliente = pizzeria.get_cliente(1),
        email = 'plutarco@terra.com.co',
        items = items_temp
    ))

    # Pedido 10
    items_temp = []
    items_temp.append(pizzeria.get_item(1))
    items_temp.append(pizzeria.get_item(0))
    items_temp.append(pizzeria.get_item(0))
    items_temp.append(pizzeria.get_item(3))

    pizzeria.add_pedido(PedidoTelefono(
        cliente = pizzeria.get_cliente(2),
        telefono = '3001111113',
        items = items_temp
    ))

    # Pedido 11
    items_temp = []
    items_temp.append(pizzeria.get_item(1))
    items_temp.append(pizzeria.get_item(1))
    items_temp.append(pizzeria.get_item(1))
    items_temp.append(pizzeria.get_item(1))

    pizzeria.add_pedido(PedidoTelefono(
        cliente = pizzeria.get_cliente(3),
        telefono = '3001111113',
        items = items_temp
    ))

    # Ejecutar metodos
    for num_cliente in range(5):
        num_producto = pizzeria.calc_prod_mas_vendido_cliente(num_cliente)
        if num_producto != -1:
            print((
                f'El producto más vendido del cliente '
                f'{pizzeria.get_cliente(num_cliente).get_nombre()}: '
                f'{pizzeria.get_item(num_producto).get_nombre()}\n'
            ))
        else:
            print(f'El cliente {pizzeria.get_cliente(num_cliente).get_nombre()} no tiene productos\n')


if __name__ == '__main__':
    main()


"""
--------------Resultados--------------

# num_cliente = 0
El producto Lasagna se vendio 0
El producto Pizza hawaiana se vendio 2
El producto Calzone se vendio 1
El producto Pasta napolitana se vendio 1
El producto Raviolis se vendio 4
El producto más vendido del cliente Pedro: Raviolis

# num_cliente = 1
El producto Lasagna se vendio 0
El producto Pizza hawaiana se vendio 0
El producto Calzone se vendio 7
El producto Pasta napolitana se vendio 1
El producto Raviolis se vendio 0
El producto más vendido del cliente Plutarco: Calzone

# num_cliente = 2
El producto Lasagna se vendio 0
El producto Pizza hawaiana se vendio 1
El producto Calzone se vendio 1
El producto Pasta napolitana se vendio 1
El producto Raviolis se vendio 1
El producto más vendido del cliente Carolina: Pizza hawaiana

# num_cliente = 3
El producto Lasagna se vendio 1
El producto Pizza hawaiana se vendio 1
El producto Calzone se vendio 1
El producto Pasta napolitana se vendio 0
El producto Raviolis se vendio 5
El producto más vendido del cliente Lina: Raviolis

# num_cliente = 4
El producto Lasagna se vendio 0
El producto Pizza hawaiana se vendio 0
El producto Calzone se vendio 0
El producto Pasta napolitana se vendio 0
El producto Raviolis se vendio 0
El cliente Ana no tiene productos
"""