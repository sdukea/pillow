def find_redundant_connection(edges):
    parent = list(range(len(edges) + 1))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in edges:
        ra = find(a)
        rb = find(b)
        if ra == rb:
            return [a, b]
        parent[ra] = rb
    return []
