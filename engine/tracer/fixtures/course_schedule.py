from collections import deque


def can_finish(num_courses, prerequisites):
    graph = {c: [] for c in range(num_courses)}
    waiting_on = [0] * num_courses
    for course, pre in prerequisites:
        graph[pre].append(course)
        waiting_on[course] += 1
    queue = deque()
    for c in range(num_courses):
        if waiting_on[c] == 0:
            queue.append(c)
    taken = []
    while queue:
        c = queue.popleft()
        taken.append(c)
        for nxt in graph[c]:
            waiting_on[nxt] -= 1
            if waiting_on[nxt] == 0:
                queue.append(nxt)
    return len(taken) == num_courses
