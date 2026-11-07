/** 计概 Python：结构化题面（OJ 风格）+ 演示代码 + 外链 */

export type ExternalPlatform = "luogu" | "leetcode" | "educoder";

export interface ExternalProblem {
  title: string;
  platform: ExternalPlatform;
  url: string;
  note?: string;
}

export interface CsSampleIO {
  input?: string;
  output: string;
  note?: string;
}

export interface CsLocalExercise {
  id: string;
  title: string;
  difficulty: "warm" | "medium" | "hard";
  /** 题面正文（背景 + 任务） */
  statement: string;
  inputSpec?: string;
  outputSpec?: string;
  samples: CsSampleIO[];
  constraints?: string;
  starterCode: string;
  checkCode: string;
  solutionCode: string;
  hint: string;
}

export interface CsShowcaseDemo {
  id: string;
  title: string;
  blurb: string;
  code: string;
}

export interface CsPracticeTrack {
  id: string;
  chapterId: string;
  title: string;
  summary: string;
  local: CsLocalExercise[];
  external: ExternalProblem[];
}

export const CS_SHOWCASE_DEMOS: CsShowcaseDemo[] = [
  {
    id: "demo_lru",
    title: "LRU 缓存",
    blurb: "OrderedDict 实现最近最少使用淘汰。",
    code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.data = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.cap:
            self.data.popitem(last=False)

cache = LRUCache(2)
cache.put(1, 1); cache.put(2, 2)
print(cache.get(1))
cache.put(3, 3)
print(cache.get(2), cache.get(3))
`,
  },
  {
    id: "demo_dijkstra",
    title: "Dijkstra 最短路",
    blurb: "堆优化单源最短路径。",
    code: `import heapq

def dijkstra(graph, start):
    dist = {u: float("inf") for u in graph}
    dist[start] = 0
    pq = [(0, start)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist

g = {"A":[("B",4),("C",2)],"B":[("C",5),("D",10)],"C":[("D",3)],"D":[]}
print(dijkstra(g, "A"))
`,
  },
  {
    id: "demo_dp_lis",
    title: "最长上升子序列",
    blurb: "O(n log n) 耐心排序。",
    code: `import bisect

def lis_length(nums):
    tails = []
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)

print(lis_length([10, 9, 2, 5, 3, 7, 101, 18]))
`,
  },
  {
    id: "demo_bfs",
    title: "网格 BFS 最短步数",
    blurb: "从左上到右下，0 可走 1 障碍。",
    code: `from collections import deque

def shortest(grid):
    n, m = len(grid), len(grid[0])
    if grid[0][0] or grid[-1][-1]:
        return -1
    q = deque([(0, 0, 1)])
    seen = {(0, 0)}
    while q:
        x, y, d = q.popleft()
        if (x, y) == (n - 1, m - 1):
            return d
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < n and 0 <= ny < m and grid[nx][ny] == 0 and (nx, ny) not in seen:
                seen.add((nx, ny))
                q.append((nx, ny, d + 1))
    return -1

print(shortest([[0,0,0],[1,1,0],[0,0,0]]))
`,
  },
  {
    id: "demo_merge_sort",
    title: "归并排序",
    blurb: "分治排序模板。",
    code: `def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    i = j = 0
    out = []
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    out.extend(left[i:]); out.extend(right[j:])
    return out

print(merge_sort([5, 2, 9, 1, 5, 6]))
`,
  },
  {
    id: "demo_knapsack",
    title: "0-1 背包",
    blurb: "容量内最大价值。",
    code: `def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [0] * (capacity + 1)
    for i in range(n):
        for c in range(capacity, weights[i] - 1, -1):
            dp[c] = max(dp[c], dp[c - weights[i]] + values[i])
    return dp[capacity]

print(knapsack([2, 3, 4], [3, 4, 5], 5))
`,
  },
  {
    id: "demo_topo",
    title: "拓扑排序（课程表）",
    blurb: "判断有向图是否有环。",
    code: `from collections import defaultdict, deque

def can_finish(num_courses, prerequisites):
    graph = defaultdict(list)
    indeg = [0] * num_courses
    for a, b in prerequisites:
        graph[b].append(a)
        indeg[a] += 1
    q = deque([i for i, d in enumerate(indeg) if d == 0])
    seen = 0
    while q:
        u = q.popleft(); seen += 1
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return seen == num_courses

print(can_finish(2, [[1, 0]]))
print(can_finish(2, [[1, 0], [0, 1]]))
`,
  },
];

export const CS_PRACTICE_TRACKS: CsPracticeTrack[] = [
  {
    id: "basics",
    chapterId: "cs.py.basics",
    title: "Python 基础",
    summary: "字符串处理与列表清洗，OJ 风格题面。",
    local: [
      {
        id: "cs_local_freq",
        title: "字符频次统计",
        difficulty: "medium",
        statement:
          "给定一个字符串 s，统计每个字符出现的次数（区分大小写）。\n请实现函数 char_freq(s: str) -> dict，返回「字符 → 次数」的字典。",
        inputSpec: "函数参数 s：长度不超过 10^5 的字符串。",
        outputSpec: "返回 dict；键为字符，值为正整数次数。空串返回空字典。",
        samples: [
          { input: 's = "aab"', output: '{"a": 2, "b": 1}' },
          { input: 's = "AbA"', output: '{"A": 2, "b": 1}', note: "大小写不同" },
          { input: 's = ""', output: "{}" },
        ],
        constraints: "1 ≤ |s| ≤ 10^5（测试中可能给空串）；禁止使用 Counter 以外的第三方库亦可，标准库均可。",
        starterCode: `def char_freq(s: str) -> dict:
    # TODO
    pass
`,
        solutionCode: `def char_freq(s: str) -> dict:
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    return freq
`,
        checkCode: `
assert char_freq("aab") == {"a": 2, "b": 1}, f"期望 {{'a':2,'b':1}}，实际 {char_freq('aab')!r}"
assert char_freq("") == {}, f"空串应返回空字典，实际 {char_freq('')!r}"
got = char_freq("AbA")
assert got == {"A": 2, "b": 1}, f"需区分大小写：期望 {{'A':2,'b':1}}，实际 {got!r}（若变成 a 请检查是否误用了 lower/upper）"
print("CHECK_OK")
`,
        hint: "遍历字符，用 dict.get(ch, 0) + 1。",
      },
      {
        id: "cs_local_normalize",
        title: "清洗学号列表",
        difficulty: "hard",
        statement:
          "教务导出的学号列表常夹杂空格、空串与重复项。\n实现 normalize_ids(raw: list[str]) -> list[str]：\n1) 去掉首尾空格；2) 丢弃空串；3) 只保留纯数字学号；4) 去重并保持首次出现顺序。",
        inputSpec: "raw：字符串列表，长度 ≤ 10^4，单串长度 ≤ 32。",
        outputSpec: "清洗后的学号列表（字符串形式，保留前导零）。",
        samples: [
          {
            input: '[" 001 ", "001", "a12", "", "002", "002 "]',
            output: '["001", "002"]',
          },
          { input: "[]", output: "[]" },
        ],
        constraints: "时间建议 O(n)；使用 set 记录已出现学号。",
        starterCode: `def normalize_ids(raw):
    # TODO
    pass
`,
        solutionCode: `def normalize_ids(raw):
    seen = set()
    out = []
    for item in raw:
        s = item.strip()
        if not s or not s.isdigit() or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out
`,
        checkCode: `
assert normalize_ids([" 001 ", "001", "a12", "", "002", "002 "]) == ["001", "002"]
assert normalize_ids([]) == []
print("CHECK_OK")
`,
        hint: "strip → isdigit → set 去重保序。",
      },
    ],
    external: [
      {
        title: "P1001 A+B Problem",
        platform: "luogu",
        url: "https://www.luogu.com.cn/problem/P1001",
        note: "输入输出热身",
      },
      {
        title: "力扣 387. 字符串中的第一个唯一字符",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/first-unique-character-in-a-string/",
      },
    ],
  },
  {
    id: "control",
    chapterId: "cs.py.control",
    title: "分支与循环",
    summary: "矩阵与跳跃：循环控制的经典题。",
    local: [
      {
        id: "cs_local_spiral_sum",
        title: "主对角线之和",
        difficulty: "medium",
        statement:
          "构造 n×n 矩阵，第 i 行第 j 列（0-based）的值为 i*n+j。\n实现 diag_sum(n: int) -> int，返回主对角线（i==j）元素之和。",
        inputSpec: "整数 n（1 ≤ n ≤ 1000）。",
        outputSpec: "一个整数，主对角线之和。",
        samples: [
          { input: "n = 1", output: "0", note: "只有 [0]" },
          { input: "n = 3", output: "12", note: "0+4+8" },
          { input: "n = 4", output: "30", note: "0+5+10+15" },
        ],
        constraints: "勿真的建二维数组；直接按公式求和即可。",
        starterCode: `def diag_sum(n: int) -> int:
    # TODO
    pass
`,
        solutionCode: `def diag_sum(n: int) -> int:
    return sum(i * n + i for i in range(n))
`,
        checkCode: `
assert diag_sum(1) == 0
assert diag_sum(3) == (0 + 4 + 8)
assert diag_sum(4) == (0 + 5 + 10 + 15)
print("CHECK_OK")
`,
        hint: "对角线元素 = i*n+i。",
      },
      {
        id: "cs_local_jump_game",
        title: "跳跃游戏",
        difficulty: "hard",
        statement:
          "给你一个非负整数数组 nums，你最初在下标 0。\n每个位置的值表示你在该位置可以跳跃的最大长度。\n判断是否能够到达最后一个下标。\n实现 can_jump(nums: list[int]) -> bool。",
        inputSpec: "nums 长度 1…10^4，元素 0…1000。",
        outputSpec: "能到达返回 True，否则 False。",
        samples: [
          { input: "[2,3,1,1,4]", output: "True" },
          { input: "[3,2,1,0,4]", output: "False" },
          { input: "[0]", output: "True" },
        ],
        constraints: "期望 O(n) 一次扫描；维护最远可达下标。",
        starterCode: `def can_jump(nums):
    # TODO
    pass
`,
        solutionCode: `def can_jump(nums):
    far = 0
    for i, step in enumerate(nums):
        if i > far:
            return False
        far = max(far, i + step)
    return True
`,
        checkCode: `
assert can_jump([2, 3, 1, 1, 4]) is True
assert can_jump([3, 2, 1, 0, 4]) is False
assert can_jump([0]) is True
print("CHECK_OK")
`,
        hint: "far = max(far, i+step)；若 i>far 则失败。",
      },
    ],
    external: [
      {
        title: "力扣 55. 跳跃游戏",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/jump-game/",
      },
      {
        title: "P1002 过河卒",
        platform: "luogu",
        url: "https://www.luogu.com.cn/problem/P1002",
      },
    ],
  },
  {
    id: "structures",
    chapterId: "cs.py.structures",
    title: "列表与字典",
    summary: "哈希表经典：两数之和 / 异位词。",
    local: [
      {
        id: "cs_local_two_sum",
        title: "两数之和",
        difficulty: "medium",
        statement:
          "给定整数数组 nums 与目标值 target，请在数组中找出和为目标值的那两个整数，并返回它们的数组下标。\n你可以假设每种输入只会对应一个答案，且同一个元素不能使用两遍。\n实现 two_sum(nums, target) -> tuple[int,int]，平均时间 O(n)。",
        inputSpec: "2 ≤ |nums| ≤ 10^4；-10^9 ≤ nums[i], target ≤ 10^9。",
        outputSpec: "二元组 (i, j)，满足 nums[i]+nums[j]==target 且 i≠j。",
        samples: [
          { input: "nums=[2,7,11,15], target=9", output: "(0, 1)" },
          { input: "nums=[3,2,4], target=6", output: "(1, 2)" },
          { input: "nums=[3,3], target=6", output: "(0, 1)" },
        ],
        constraints: "禁止双重循环 O(n²) 作为最终解（可用哈希表）。",
        starterCode: `def two_sum(nums, target):
    # TODO: 返回 (i, j)
    pass
`,
        solutionCode: `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return (seen[need], i)
        seen[x] = i
    raise ValueError("no solution")
`,
        checkCode: `
assert two_sum([2, 7, 11, 15], 9) == (0, 1)
assert two_sum([3, 2, 4], 6) == (1, 2)
a, b = two_sum([3, 3], 6)
assert {a, b} == {0, 1}
print("CHECK_OK")
`,
        hint: "边遍历边把值→下标放入 dict。",
      },
      {
        id: "cs_local_anagrams",
        title: "字母异位词分组",
        difficulty: "hard",
        statement:
          "给你一个字符串数组，请将字母异位词组合在一起。可以按任意顺序返回答案。\n字母异位词指字母相同、排列不同的字符串。\n实现 group_anagrams(words) -> list[list[str]]。",
        inputSpec: "1 ≤ |words| ≤ 10^4；0 ≤ |words[i]| ≤ 100；仅小写或空串。",
        outputSpec: "分组后的二维列表；组间、组内顺序不限。",
        samples: [
          {
            input: '["eat","tea","tan","ate","nat","bat"]',
            output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
            note: "顺序可变",
          },
        ],
        constraints: "可用 sorted(word) 作为哈希键。",
        starterCode: `def group_anagrams(words):
    # TODO
    pass
`,
        solutionCode: `from collections import defaultdict

def group_anagrams(words):
    buckets = defaultdict(list)
    for w in words:
        key = tuple(sorted(w))
        buckets[key].append(w)
    return list(buckets.values())
`,
        checkCode: `
def _norm(groups):
    return sorted(sorted(g) for g in groups)

assert _norm(group_anagrams(["eat","tea","tan","ate","nat","bat"])) == _norm([["bat"],["nat","tan"],["ate","eat","tea"]])
assert _norm(group_anagrams([""])) == [[""]]
print("CHECK_OK")
`,
        hint: "tuple(sorted(w)) 做键。",
      },
    ],
    external: [
      {
        title: "力扣 1. 两数之和",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/two-sum/",
      },
      {
        title: "力扣 49. 字母异位词分组",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/group-anagrams/",
      },
    ],
  },
  {
    id: "functions",
    chapterId: "cs.py.functions",
    title: "函数",
    summary: "二分与递归展开。",
    local: [
      {
        id: "cs_local_binary_search",
        title: "二分查找",
        difficulty: "medium",
        statement:
          "给定升序数组 arr 与目标值 target，返回 target 的下标；若不存在返回 -1。\n实现 binary_search(arr, target) -> int。",
        inputSpec: "0 ≤ |arr| ≤ 10^5；元素递增；-10^9 ≤ 值 ≤ 10^9。",
        outputSpec: "下标或 -1。",
        samples: [
          { input: "arr=[1,3,5,7,9], target=7", output: "3" },
          { input: "arr=[1,3,5,7,9], target=2", output: "-1" },
          { input: "arr=[], target=1", output: "-1" },
        ],
        constraints: "必须 O(log n)。",
        starterCode: `def binary_search(arr, target):
    # TODO
    pass
`,
        solutionCode: `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
        checkCode: `
assert binary_search([1, 3, 5, 7, 9], 7) == 3
assert binary_search([1, 3, 5, 7, 9], 2) == -1
assert binary_search([], 1) == -1
print("CHECK_OK")
`,
        hint: "维护 lo/hi，比较 mid。",
      },
      {
        id: "cs_local_flatten",
        title: "嵌套列表展开",
        difficulty: "hard",
        statement:
          "实现 flatten(xs)：把嵌套的 list 展成一维列表（只处理 list，不处理 tuple）。",
        inputSpec: "任意深度嵌套的 list，元素为 int 或 list。",
        outputSpec: "一维 int 列表。",
        samples: [
          { input: "[1,[2,[3,4],5]]", output: "[1,2,3,4,5]" },
          { input: "[]", output: "[]" },
          { input: "[1,2,3]", output: "[1,2,3]" },
        ],
        constraints: "递归或显式栈均可。",
        starterCode: `def flatten(xs):
    # TODO
    pass
`,
        solutionCode: `def flatten(xs):
    out = []
    for x in xs:
        if isinstance(x, list):
            out.extend(flatten(x))
        else:
            out.append(x)
    return out
`,
        checkCode: `
assert flatten([1, [2, [3, 4], 5]]) == [1, 2, 3, 4, 5]
assert flatten([]) == []
assert flatten([1, 2, 3]) == [1, 2, 3]
print("CHECK_OK")
`,
        hint: "遇到 list 就递归 extend。",
      },
    ],
    external: [
      {
        title: "力扣 704. 二分查找",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/binary-search/",
      },
      {
        title: "力扣 341. 扁平化嵌套列表迭代器",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/flatten-nested-list-iterator/",
      },
    ],
  },
  {
    id: "algorithm",
    chapterId: "cs.py.algorithm",
    title: "算法思维",
    summary: "递推与完全背包。",
    local: [
      {
        id: "cs_local_climb",
        title: "爬楼梯",
        difficulty: "medium",
        statement:
          "假设你正在爬楼梯。需要 n 阶你才能到达楼顶。每次可以爬 1 或 2 个台阶。有多少种不同方法？\n实现 climb(n: int) -> int。请用 DP / 滚动变量，勿指数级裸递归。",
        inputSpec: "1 ≤ n ≤ 45。",
        outputSpec: "方案数。",
        samples: [
          { input: "n=2", output: "2" },
          { input: "n=3", output: "3" },
          { input: "n=5", output: "8" },
        ],
        constraints: "f(n)=f(n-1)+f(n-2)。",
        starterCode: `def climb(n: int) -> int:
    # TODO
    pass
`,
        solutionCode: `def climb(n: int) -> int:
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
`,
        checkCode: `
assert climb(2) == 2
assert climb(3) == 3
assert climb(5) == 8
assert climb(10) == 89
print("CHECK_OK")
`,
        hint: "滚动两个变量。",
      },
      {
        id: "cs_local_coin",
        title: "零钱兑换",
        difficulty: "hard",
        statement:
          "给你不同面额的硬币 coins 与总金额 amount。计算可以凑成总金额所需的最少硬币个数；若无法凑出返回 -1。\n实现 coin_change(coins, amount) -> int。",
        inputSpec: "1 ≤ |coins| ≤ 12；1 ≤ coins[i] ≤ 2^31-1；0 ≤ amount ≤ 10^4。",
        outputSpec: "最少枚数或 -1。",
        samples: [
          { input: "coins=[1,2,5], amount=11", output: "3", note: "5+5+1" },
          { input: "coins=[2], amount=3", output: "-1" },
          { input: "coins=[1], amount=0", output: "0" },
        ],
        constraints: "完全背包：dp[x]=min(dp[x-c]+1)。",
        starterCode: `def coin_change(coins, amount):
    # TODO
    pass
`,
        solutionCode: `def coin_change(coins, amount):
    INF = amount + 1
    dp = [INF] * (amount + 1)
    dp[0] = 0
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x:
                dp[x] = min(dp[x], dp[x - c] + 1)
    return -1 if dp[amount] == INF else dp[amount]
`,
        checkCode: `
assert coin_change([1, 2, 5], 11) == 3
assert coin_change([2], 3) == -1
assert coin_change([1], 0) == 0
print("CHECK_OK")
`,
        hint: "初始化 dp[0]=0，其余为 inf。",
      },
    ],
    external: [
      {
        title: "力扣 70. 爬楼梯",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/climbing-stairs/",
      },
      {
        title: "力扣 322. 零钱兑换",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/coin-change/",
      },
    ],
  },
  {
    id: "data",
    chapterId: "cs.py.data",
    title: "数据思维",
    summary: "滑动窗口统计。",
    local: [
      {
        id: "cs_local_max_avg",
        title: "子数组最大平均数",
        difficulty: "medium",
        statement:
          "给你一个整数数组 nums 和一个整数 k，找出长度为 k 的连续子数组的最大平均值，并返回该值。\n实现 max_avg(nums, k) -> float。",
        inputSpec: "1 ≤ k ≤ |nums| ≤ 10^5。",
        outputSpec: "最大平均值（浮点）。",
        samples: [
          { input: "nums=[1,12,-5,-6,50,3], k=4", output: "12.75" },
          { input: "nums=[5], k=1", output: "5.0" },
        ],
        constraints: "滑窗 O(n)。",
        starterCode: `def max_avg(nums, k):
    # TODO
    pass
`,
        solutionCode: `def max_avg(nums, k):
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]
        best = max(best, window)
    return best / k
`,
        checkCode: `
assert abs(max_avg([1, 12, -5, -6, 50, 3], 4) - 12.75) < 1e-9
assert abs(max_avg([5], 1) - 5) < 1e-9
print("CHECK_OK")
`,
        hint: "先算前 k 个和，再加减滑窗。",
      },
    ],
    external: [
      {
        title: "力扣 643. 子数组最大平均数 I",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/maximum-average-subarray-i/",
      },
    ],
  },
  {
    id: "network",
    chapterId: "cs.py.network",
    title: "网络 / 深度学习入门",
    summary: "感知机一步更新（概念向）。",
    local: [
      {
        id: "cs_local_perceptron_step",
        title: "感知机一步更新",
        difficulty: "hard",
        statement:
          "实现感知机的单步权重更新 perceptron_step(w, x, y, lr=0.1)。\n预测：pred = 1 if Σ w_i x_i > 0 else 0。\n若 pred≠y，则对每个分量：w_i ← w_i + lr*(y-pred)*x_i。\n返回更新后的权重列表（即使未更新也返回拷贝）。",
        inputSpec: "w、x 等长浮点/整数列表；y ∈ {0,1}；lr>0。",
        outputSpec: "新的权重 list。",
        samples: [
          {
            input: "w=[0,0], x=[1,1], y=1, lr=0.5",
            output: "[0.5, 0.5]",
            note: "初值全 0 时 pred=0，需要更新",
          },
          {
            input: "w=[0.5,0.5], x=[1,1], y=1, lr=0.5",
            output: "[0.5, 0.5]",
            note: "已正确则不变",
          },
        ],
        constraints: "阈值为严格大于 0。",
        starterCode: `def perceptron_step(w, x, y, lr=0.1):
    # TODO
    pass
`,
        solutionCode: `def perceptron_step(w, x, y, lr=0.1):
    s = sum(wi * xi for wi, xi in zip(w, x))
    pred = 1 if s > 0 else 0
    if pred == y:
        return list(w)
    return [wi + lr * (y - pred) * xi for wi, xi in zip(w, x)]
`,
        checkCode: `
w = [0.0, 0.0]
nw = perceptron_step(w, [1, 1], 1, lr=0.5)
assert nw == [0.5, 0.5]
nw2 = perceptron_step([0.5, 0.5], [1, 1], 1, lr=0.5)
assert nw2 == [0.5, 0.5]
print("CHECK_OK")
`,
        hint: "先算加权和得 pred，错了再按 lr*(y-pred)*x 更新。",
      },
    ],
    external: [
      {
        title: "力扣 207. 课程表",
        platform: "leetcode",
        url: "https://leetcode.cn/problems/course-schedule/",
      },
    ],
  },
];

export function trackByChapterId(chapterId: string): CsPracticeTrack | undefined {
  return CS_PRACTICE_TRACKS.find((t) => t.chapterId === chapterId);
}
