def reverse_list(head):
    values = []
    node = head
    while node:
        values.append(node.val)
        node = node.next
    new_head = None
    for v in values:
        new_head = ListNode(v, new_head)
    return new_head
