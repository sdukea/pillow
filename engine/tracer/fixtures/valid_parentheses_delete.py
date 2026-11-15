def is_valid(s):
    pairs = {"(": ")", "[": "]", "{": "}"}
    chars = list(s)
    removed = True
    while removed:
        removed = False
        for i in range(len(chars) - 1):
            if pairs.get(chars[i]) == chars[i + 1]:
                del chars[i:i + 2]
                removed = True
                break
    return not chars
