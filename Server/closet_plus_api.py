from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from collections import defaultdict, OrderedDict
from itertools import combinations
import time


# uvicorn closet_plus_api:app --host 0.0.0.0 --port 8999

# Khởi tạo FastAPI
app = FastAPI(title="Association Rule Mining API")

# Xử lý CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Định nghĩa model cho request body
class MiningRequest(BaseModel):
    transactions: List[List[str]]
    min_sup: float
    min_confidence: float = 0.8
    min_lift: float = 1.0

# Định nghĩa model cho response
class MiningResponse(BaseModel):
    closed_itemsets: List[Dict[str, Any]]
    frequent_itemsets: List[Dict[str, Any]]
    association_rules: List[Dict[str, Any]]
    fp_tree: Dict[str, Any]
    f_list: List[str]
    execution_steps: List[Dict[str, Any]]
    runtime: float

# Định nghĩa các lớp và hàm thuật toán CLOSET+
class FPNode:
    def __init__(self, item, count, parent):
        self.item = item
        self.count = count
        self.parent = parent
        self.children = {}
        self.link = None

    def to_dict(self):
        """Chuyển node thành dict để serialize thành JSON"""
        return {
            "item": self.item,
            "count": self.count,
            "children": [child.to_dict() for child in self.children.values()]
        }

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

    def to_dict(self):
        """Chuyển FP-Tree thành dict để serialize thành JSON"""
        return {
            "root": self.root.to_dict(),
            "header_table": {item: [{"count": node.count, "path": self.get_node_path(node)} for node in nodes] for item, nodes in self.header_table.items()},
            "item_counts": dict(self.item_counts)
        }

    def get_node_path(self, node):
        """Lấy đường dẫn từ root đến node"""
        path = []
        current = node
        while current and current.item is not None:
            path.append(current.item)
            current = current.parent
        return path[::-1]

def build_f_list(transactions, min_sup, execution_steps):
    item_counts = defaultdict(int)
    for trans in transactions:
        for item in trans:
            item_counts[item] += 1
    
    f_list = [(item, count) for item, count in item_counts.items() if count >= min_sup]
    f_list.sort(key=lambda x: (-x[1], x[0]))
    
    # Thêm vào execution_steps
    step = {
        "step": "Xây dựng danh sách F",
        "sub_steps": [
            {
                "description": "Đếm tần suất xuất hiện của các mục",
                "details": f"Tần suất mục: {dict(item_counts)}"
            },
            {
                "description": "Lọc các mục có độ hỗ trợ >= min_sup",
                "details": f"Danh sách F: {[(item, count) for item, count in f_list]}"
            }
        ]
    }
    execution_steps.append(step)
    
    return [item for item, _ in f_list]

def build_fp_tree(transactions, f_list, min_sup, execution_steps):
    fp_tree = FPTree()
    sub_steps = []
    for trans in transactions:
        filtered_trans = [item for item in trans if item in f_list]
        filtered_trans.sort(key=lambda x: f_list.index(x))
        if filtered_trans:
            fp_tree.insert_transaction(filtered_trans)
            sub_steps.append({
                "description": "Thêm giao dịch vào FP-Tree",
                "details": f"Filtered transaction: {filtered_trans}"
            })
    
    # Thêm vào execution_steps
    step = {
        "step": "Xây dựng FP-Tree",
        "sub_steps": sub_steps
    }
    execution_steps.append(step)
    
    return fp_tree

def is_dense_dataset(fp_tree, threshold=10, execution_steps=None):
    avg_count = fp_tree.get_avg_node_count()
    is_dense = avg_count > threshold
    
    # Thêm vào execution_steps
    step = {
        "step": "Kiểm tra độ dày đặc của tập dữ liệu",
        "sub_steps": [
            {
                "description": "Tính toán số lượng nút trung bình",
                "details": f"Số lượng trung bình: {avg_count}"
            },
            {
                "description": "Xác định độ dày đặc",
                "details": f"Có dày đặc: {is_dense} (ngưỡng={threshold})"
            }
        ]
    }
    execution_steps.append(step)
    
    return is_dense

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

def check_upward(itemset, support, transactions, parent_step):
    itemset_set = set(itemset)
    trans_containing_itemset = [trans for trans in transactions if itemset_set.issubset(set(trans))]
    actual_support = len(trans_containing_itemset)
    
    sub_steps = []
    
    if actual_support != support:
        sub_steps.append({
            "description": "Failed support check",
            "details": f"Actual support: {actual_support}, Expected: {support}"
        })
        parent_step["sub_steps"].append({
            "description": f"Check upward closure for {itemset}",
            "sub_steps": sub_steps
        })
        return False
    
    sub_steps.append({
        "description": "Thành công kiểm tra độ hỗ trợ",
        "details": f"Support: {actual_support}"
    })
    
    for trans in trans_containing_itemset:
        for item in trans:
            if item not in itemset:
                extended_itemset = sorted(itemset + [item], key=lambda x: f_list.index(x) if x in f_list else float('inf'))
                extended_support = compute_support(extended_itemset, transactions)
                if extended_support == actual_support:
                    sub_steps.append({
                        "description": "Thất bại trong mở rộng itemset",
                        "details": f"Extended itemset {extended_itemset} có cùng support: {extended_support}"
                    })
                    parent_step["sub_steps"].append({
                        "description": f"Kiểm tra tính đóng mở rộng cho {itemset}",
                        "sub_steps": sub_steps
                    })
                    return False
    sub_steps.append({
        "description": "Kiểm tra mở rộng itemset thành công",
        "details": "Không tìm thấy tập siêu với cùng support"
    })
    
    parent_step["sub_steps"].append({
        "description": f"Kiểm tra tính đóng mở rộng cho {itemset}",
        "sub_steps": sub_steps
    })
    return True

def is_closed(itemset, support, closed_itemsets, dense, result_tree, transactions, parent_step):
    sub_steps = []
    if dense and result_tree is not None:
        result = check_result_tree(result_tree, itemset, support)
        sub_steps.append({
            "description": "Kiểm tra sử dụng result_tree",
            "details": f"Is closed: {result}"
        })
        parent_step["sub_steps"].append({
            "description": f"Kiểm tra tính đóng cho {itemset}",
            "sub_steps": sub_steps
        })
        return result
    else:
        parent_step["sub_steps"].append({
            "description": f"Kiểm tra tính đóng cho {itemset}",
            "sub_steps": []
        })
        result = check_upward(itemset, support, transactions, parent_step["sub_steps"][-1])
        return result

def update_result_tree(result_tree, itemset, support, parent_step):
    result_tree[tuple(itemset)] = support
    parent_step["sub_steps"].append({
        "description": "Cập nhật result_tree",
        "details": f"Itemset: {itemset}, Support: {support}"
    })

def build_conditional_tree(fp_tree, item, min_sup, parent_step):
    cond_tree = FPTree()
    sub_steps = []
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
            sub_steps.append({
                "description": "Đã thêm conditional path",
                "details": f"Path: {path}, Count: {count}"
            })
    
    parent_step["sub_steps"].append({
        "description": f"Xây dựng conditional tree cho item {item}",
        "sub_steps": sub_steps
    })
    return cond_tree

def mine_fp_tree(fp_tree, prefix, min_sup, closed_itemsets, dense, transactions, f_list, result_tree, execution_steps, level=0):
    step = {
        "step": f"Khai thác FP-Tree (Level {level})",
        "sub_steps": []
    }
    execution_steps.append(step)
    
    header_table = OrderedDict()
    for item in f_list:
        if item in fp_tree.header_table:
            count = sum(node.count for node in fp_tree.header_table[item])
            if count >= min_sup:
                header_table[item] = count
    
    items = list(header_table.keys())
    if not dense:
        items.reverse()
    
    step["sub_steps"].append({
        "description": "Khởi tạo header table",
        "details": f"Items: {items}"
    })
    
    for item in items:
        new_prefix = prefix + [item]
        support = header_table[item]
        
        candidate = sorted(new_prefix, key=lambda x: f_list.index(x) if x in f_list else float('inf'))
        actual_support = compute_support(candidate, transactions)
        
        candidate_step = {
            "description": f"Xử lý node {candidate}",
            "sub_steps": []
        }
        step["sub_steps"].append(candidate_step)
        
        if any(set(candidate) == set(existing[0]) for existing in closed_itemsets):
            candidate_step["sub_steps"].append({
                "description": "Bỏ qua",
                "details": "Đã là closed itemsets"
            })
            continue
        
        if actual_support >= min_sup and is_closed(candidate, actual_support, closed_itemsets, dense, result_tree, transactions, candidate_step):
            closed_itemsets.append((candidate, actual_support))
            candidate_step["sub_steps"].append({
                "description": "Thêm vào closed itemset",
                "details": f"Itemset: {candidate}, Support: {actual_support}"
            })
            if dense:
                update_result_tree(result_tree, candidate, actual_support, candidate_step)
        
        cond_tree = build_conditional_tree(fp_tree, item, min_sup, candidate_step)
        if cond_tree.header_table:
            mine_fp_tree(cond_tree, new_prefix, min_sup, closed_itemsets, dense, transactions, f_list, result_tree, execution_steps, level + 1)

def generate_frequent_itemsets(closed_itemsets, execution_steps):
    step = {
        "step": "Tạo Frequent Itemsets",
        "sub_steps": []
    }
    execution_steps.append(step)
    
    frequent_itemsets = {}
    for itemset, support in closed_itemsets:
        itemset = tuple(sorted(itemset))
        for r in range(1, len(itemset) + 1):
            for subset in combinations(itemset, r):
                subset = tuple(sorted(subset))
                if subset not in frequent_itemsets or frequent_itemsets[subset] < support:
                    frequent_itemsets[subset] = support
                    step["sub_steps"].append({
                        "description": "Thêm vào frequent subset",
                        "details": f"Subset: {subset}, Support: {support}"
                    })
    
    return [(list(subset), support) for subset, support in frequent_itemsets.items()]

def generate_association_rules(frequent_itemsets, total_transactions, min_confidence=0.8, min_lift=1.0, execution_steps=None):
    step = {
        "step": "Sinh luật kết hợp",
        "sub_steps": []
    }
    execution_steps.append(step)
    
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
                    step["sub_steps"].append({
                        "description": "Bỏ qua luật",
                        "details": f"Luật: {x} => {y}, Độ tin cậy: {confidence} < {min_confidence}"
                    })
                    continue
                    
                support_y = support_dict[y]
                lift = confidence / support_y
                
                if lift <= min_lift:
                    step["sub_steps"].append({
                        "description": "Bỏ qua luật",
                        "details": f"Luật: {x} => {y}, Lift: {lift} <= {min_lift}"
                    })
                    continue
                    
                rule = {
                    'rule': f"{''.join(x).upper()} => {''.join(y).upper()}",
                    'support': support_xy,
                    'confidence': confidence,
                    'lift': lift
                }
                association_rules.append(rule)
                step["sub_steps"].append({
                    "description": "Thêm luật kết hợp",
                    "details": f"Luật: {rule['rule']}, Độ hỗ trợ: {rule['support']}, Độ tin cậy: {rule['confidence']}, Lift: {rule['lift']}"
                })
    
    return association_rules

def closet_plus(transactions, min_sup, execution_steps):
    global f_list
    f_list = build_f_list(transactions, min_sup, execution_steps)
    if not f_list:
        execution_steps.append({
            "step": "Check F-list",
            "sub_steps": [
                {
                    "description": "Không tìm thấy frequent items",
                    "details": "Trả về closed itemsets rỗng"
                }
            ]
        })
        return [], f_list, None
    fp_tree = build_fp_tree(transactions, f_list, min_sup, execution_steps)
    dense = is_dense_dataset(fp_tree, execution_steps=execution_steps)
    closed_itemsets = []
    result_tree = {}
    mine_fp_tree(fp_tree, [], min_sup, closed_itemsets, dense, transactions, f_list, result_tree, execution_steps)
    return closed_itemsets, f_list, fp_tree

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

        # Danh sách ghi lại các bước thực thi
        execution_steps = []

        # Tìm tập hợp đóng thường xuyên, F-list và FP-Tree
        closed_itemsets, f_list, fp_tree = closet_plus(transactions, min_sup, execution_steps)
        closed_response = [{"itemset": ''.join(itemset).upper(), "support": support} for itemset, support in closed_itemsets]

        # Sinh tập phổ biến
        frequent_itemsets = generate_frequent_itemsets(closed_itemsets, execution_steps)
        frequent_response = [{"itemset": ''.join(itemset).upper(), "support": support} for itemset, support in frequent_itemsets]

        # Sinh luật kết hợp
        association_rules = generate_association_rules(frequent_itemsets, len(transactions), min_confidence, min_lift, execution_steps)

        end_time = time.time()
        runtime = end_time - start_time

        # Trả về kết quả
        return MiningResponse(
            closed_itemsets=closed_response,
            frequent_itemsets=frequent_response,
            association_rules=association_rules,
            fp_tree=fp_tree.to_dict() if fp_tree else {},
            f_list=f_list,
            execution_steps=execution_steps,
            runtime=runtime
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

# Chạy server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7900)