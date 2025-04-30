from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from collections import defaultdict, OrderedDict
from itertools import combinations
import time

# uvicorn closet_plus_api:app --host 0.0.0.0 --port 8000

# Khởi tạo FastAPI
app = FastAPI(title="Association Rule Mining API")

# Xử lý CORS
# Cho phép các domain cụ thể hoặc tất cả domain truy cập API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả domain (có thể giới hạn: ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả phương thức (GET, POST, v.v.)
    allow_headers=["*"],  # Cho phép tất cả header
)

# Định nghĩa model cho request body
class MiningRequest(BaseModel):
    transactions: List[List[str]]  # Danh sách giao dịch
    min_sup: float  # Ngưỡng support tối thiểu (số giao dịch)
    min_confidence: float = 0.8  # Ngưỡng confidence tối thiểu
    min_lift: float = 1.0  # Ngưỡng lift tối thiểu

# Định nghĩa model cho response
class MiningResponse(BaseModel):
    closed_itemsets: List[Dict[str, Any]]
    frequent_itemsets: List[Dict[str, Any]]
    association_rules: List[Dict[str, Any]]
    runtime: float

# Định nghĩa các lớp và hàm thuật toán CLOSET+
class FPNode:
    def __init__(self, item, count, parent):
        self.item = item
        self.count = count
        self.parent = parent
        self.children = {}
        self.link = None

class FPTree:
    def __init__(self):
        self.root = FPNode(None, 0, None)
        self.header_table = defaultdict(list)
        self.item_counts = defaultdict(int)

    def insert_transaction(self, transaction, count=1):
        current = self.root
        for item in transaction:
            if item in current.children:
                current.children[item].count += count
            else:
                new_node = FPNode(item, count, current)
                current.children[item] = new_node
                self.header_table[item].append(new_node)
            current = current.children[item]
            self.item_counts[item] += count

    def get_avg_node_count(self):
        total_count = sum(node.count for item in self.header_table for node in self.header_table[item])
        total_nodes = sum(len(self.header_table[item]) for item in self.header_table)
        return total_count / total_nodes if total_nodes > 0 else 0

def build_f_list(transactions, min_sup):
    item_counts = defaultdict(int)
    for trans in transactions:
        for item in trans:
            item_counts[item] += 1
    
    f_list = [(item, count) for item, count in item_counts.items() if count >= min_sup]
    f_list.sort(key=lambda x: (-x[1], x[0]))
    return [item for item, _ in f_list]

def build_fp_tree(transactions, f_list, min_sup):
    fp_tree = FPTree()
    for trans in transactions:
        filtered_trans = [item for item in trans if item in f_list]
        filtered_trans.sort(key=lambda x: f_list.index(x))
        if filtered_trans:
            fp_tree.insert_transaction(filtered_trans)
    return fp_tree

def is_dense_dataset(fp_tree, threshold=10):
    avg_count = fp_tree.get_avg_node_count()
    return avg_count > threshold

def compute_support(itemset, transactions):
    itemset_set = set(itemset)
    return sum(1 for trans in transactions if itemset_set.issubset(set(trans)))

def check_result_tree(result_tree, itemset, support):
    itemset_set = set(itemset)
    for existing_itemset, existing_support in result_tree.items():
        existing_set = set(existing_itemset)
        if existing_support == support and itemset_set.issubset(existing_set) and itemset_set != existing_set:
            return False
    return True

def check_upward(itemset, support, transactions):
    itemset_set = set(itemset)
    trans_containing_itemset = [trans for trans in transactions if itemset_set.issubset(set(trans))]
    actual_support = len(trans_containing_itemset)
    
    if actual_support != support:
        return False
    
    for trans in trans_containing_itemset:
        for item in trans:
            if item not in itemset:
                extended_itemset = sorted(itemset + [item], key=lambda x: f_list.index(x) if x in f_list else float('inf'))
                extended_support = compute_support(extended_itemset, transactions)
                if extended_support == actual_support:
                    return False
    return True

def is_closed(itemset, support, closed_itemsets, dense, result_tree, transactions):
    if dense and result_tree is not None:
        return check_result_tree(result_tree, itemset, support)
    else:
        return check_upward(itemset, support, transactions)

def update_result_tree(result_tree, itemset, support):
    result_tree[tuple(itemset)] = support

def build_conditional_tree(fp_tree, item, min_sup):
    cond_tree = FPTree()
    for node in fp_tree.header_table[item]:
        count = node.count
        path = []
        current = node
        while current.parent and current.parent.item is not None:
            path.append(current.parent.item)
            current = current.parent
        path.reverse()
        if path:
            cond_tree.insert_transaction(path, count)
    return cond_tree

def mine_fp_tree(fp_tree, prefix, min_sup, closed_itemsets, dense, transactions, f_list, result_tree, level=0):
    header_table = OrderedDict()
    for item in f_list:
        if item in fp_tree.header_table:
            count = sum(node.count for node in fp_tree.header_table[item])
            if count >= min_sup:
                header_table[item] = count
    
    items = list(header_table.keys())
    if not dense:
        items.reverse()
    
    for item in items:
        new_prefix = prefix + [item]
        support = header_table[item]
        
        candidate = sorted(new_prefix, key=lambda x: f_list.index(x) if x in f_list else float('inf'))
        actual_support = compute_support(candidate, transactions)
        
        if any(set(candidate) == set(existing[0]) for existing in closed_itemsets):
            continue
        
        if actual_support >= min_sup and is_closed(candidate, actual_support, closed_itemsets, dense, result_tree, transactions):
            closed_itemsets.append((candidate, actual_support))
            if dense:
                update_result_tree(result_tree, candidate, actual_support)
        
        cond_tree = build_conditional_tree(fp_tree, item, min_sup)
        if cond_tree.header_table:
            mine_fp_tree(cond_tree, new_prefix, min_sup, closed_itemsets, dense, transactions, f_list, result_tree, level + 1)

def generate_frequent_itemsets(closed_itemsets):
    frequent_itemsets = {}
    for itemset, support in closed_itemsets:
        itemset = tuple(sorted(itemset))
        for r in range(1, len(itemset) + 1):
            for subset in combinations(itemset, r):
                subset = tuple(sorted(subset))
                if subset not in frequent_itemsets or frequent_itemsets[subset] < support:
                    frequent_itemsets[subset] = support
    return [(list(subset), support) for subset, support in frequent_itemsets.items()]

def generate_association_rules(frequent_itemsets, total_transactions, min_confidence=0.8, min_lift=1.0):
    association_rules = []
    support_dict = {tuple(itemset): support / total_transactions for itemset, support in frequent_itemsets}
    
    for itemset, support in frequent_itemsets:
        if len(itemset) < 2:
            continue
        itemset = tuple(sorted(itemset))
        support_xy = support_dict[itemset]
        
        for r in range(1, len(itemset)):
            for x in combinations(itemset, r):
                x = tuple(sorted(x))
                y = tuple(sorted(set(itemset) - set(x)))
                if not y:
                    continue
                    
                support_x = support_dict[x]
                confidence = support_xy / support_x
                
                if confidence < min_confidence:
                    continue
                    
                support_y = support_dict[y]
                lift = confidence / support_y
                
                if lift <= min_lift:
                    continue
                    
                association_rules.append({
                    'rule': f"{''.join(x).upper()} => {''.join(y).upper()}",
                    'support': support_xy,
                    'confidence': confidence,
                    'lift': lift
                })
    
    return association_rules

def closet_plus(transactions, min_sup):
    global f_list
    f_list = build_f_list(transactions, min_sup)
    if not f_list:
        return []
    fp_tree = build_fp_tree(transactions, f_list, min_sup)
    dense = is_dense_dataset(fp_tree)
    closed_itemsets = []
    result_tree = {}
    mine_fp_tree(fp_tree, [], min_sup, closed_itemsets, dense, transactions, f_list, result_tree)
    return closed_itemsets

# API Endpoint
@app.post("/mine", response_model=MiningResponse)
async def mine_association_rules(request: MiningRequest):
    try:
        transactions = request.transactions
        min_sup = request.min_sup
        min_confidence = request.min_confidence
        min_lift = request.min_lift

        # Kiểm tra dữ liệu đầu vào
        if not transactions:
            raise HTTPException(status_code=400, detail="Transactions list cannot be empty")
        if min_sup <= 0:
            raise HTTPException(status_code=400, detail="min_sup must be greater than 0")
        if not (0 <= min_confidence <= 1):
            raise HTTPException(status_code=400, detail="min_confidence must be between 0 and 1")
        if min_lift <= 0:
            raise HTTPException(status_code=400, detail="min_lift must be greater than 0")

        # Đo thời gian thực thi
        start_time = time.time()

        # Tìm tập hợp đóng thường xuyên
        closed_itemsets = closet_plus(transactions, min_sup)
        closed_response = [{"itemset": ''.join(itemset).upper(), "support": support} for itemset, support in closed_itemsets]

        # Sinh tập phổ biến
        frequent_itemsets = generate_frequent_itemsets(closed_itemsets)
        frequent_response = [{"itemset": ''.join(itemset).upper(), "support": support} for itemset, support in frequent_itemsets]

        # Sinh luật kết hợp
        association_rules = generate_association_rules(frequent_itemsets, len(transactions), min_confidence, min_lift)

        end_time = time.time()
        runtime = end_time - start_time

        # Trả về kết quả
        return MiningResponse(
            closed_itemsets=closed_response,
            frequent_itemsets=frequent_response,
            association_rules=association_rules,
            runtime=runtime
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

# Chạy server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)