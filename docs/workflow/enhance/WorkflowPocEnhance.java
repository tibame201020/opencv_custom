package custom.tibame201020.adbOpenCv.workflow;

import java.util.*;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * n8n workflow POC - 驗證簡易工作流引擎架構
 * 支援：1. Convert Node - 數據轉換節點
 * 2. If Node - 條件判斷節點
 * 3. Sub Workflow Node - 支援子工作流作為節點，用於組合 for/while/case 等
 */
public class WorkflowPocEnhance {

    public static void main(String[] args) {
        System.out.println("=== n8n Workflow POC Demo ===\n");
        demo1SimpleConvertWorkflow();
        demo2ConvertAndIfWorkflow();
        demoWhileLoop();
        demoForLoopFixedCount();
        demoForEachCollection();
        demoCaseWhenBranching();
        demoNestedSubflow();
    }

    static void demoNestedSubflow() {
        System.out.println("--- Demo: Nested Subflow (Parent -> SubA -> SubB) ---");

        // Level 2: SubB - Validator
        Workflow<Object, Object> subB = new Workflow<>();
        subB.addNode(WorkflowNode.createIfNode("validate", "isInteger?", i -> i instanceof Integer))
                .addNode(WorkflowNode.createConvertNode("validPath", "markValid", i -> "VALID:" + i))
                .addNode(WorkflowNode.createConvertNode("invalidPath", "markInvalid", i -> "INVALID:" + i))
                .addEdge(new WorkflowEdge("be1", "validate", "validPath", "true"))
                .addEdge(new WorkflowEdge("be2", "validate", "invalidPath", "false"));

        // Level 1: SubA - Processor (Calls SubB)
        Workflow<Object, Object> subA = new Workflow<>();
        subA.addNode(WorkflowNode.createSubWorkflowNode("callSubB", "ValidatorFlow", subB))
                .addNode(WorkflowNode.createConvertNode("appendMeta", "addMetadata", s -> s + " [Processed by SubA]"))
                .addEdge(new WorkflowEdge("ae1", "callSubB", "appendMeta", "success"));

        // Level 0: Parent Flow
        Workflow<Object, Object> parent = new Workflow<>();
        parent.addNode(WorkflowNode.createConvertNode("start", "init", i -> i))
                .addNode(WorkflowNode.createSubWorkflowNode("callSubA", "ProcessorFlow", subA))
                .addEdge(new WorkflowEdge("pe1", "start", "callSubA", "success"));

        System.out.println("Test Case 1: Valid input (Integer)");
        ExecutionResult<Object> res1 = new FlowEngine<>(parent).execute(100);
        System.out.println("Output: " + res1.output());

        System.out.println("Test Case 2: Invalid input (String)");
        ExecutionResult<Object> res2 = new FlowEngine<>(parent).execute("NotInt");
        System.out.println("Output: " + res2.output());
        System.out.println();
    }

    static void demo1SimpleConvertWorkflow() {
        System.out.println("--- Demo 1: Simple Convert Workflow ---");
        Workflow<Object, Object> workflow = new Workflow<>();

        WorkflowNode node1 = WorkflowNode.createConvertNode("n1", "toUpperCase",
                s -> ((String) s).toUpperCase());
        WorkflowNode node2 = WorkflowNode.createConvertNode("n2", "appendHash",
                s -> s + "#");

        workflow.addNode(node1).addNode(node2)
                .addEdge(new WorkflowEdge("e1", "n1", "n2", "success"));

        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute("hello");
        System.out.println("Input: hello");
        System.out.println("Output: " + result.output());
        System.out.println("Execution path: " + result.executionPath());
        System.out.println();
    }

    static void demo2ConvertAndIfWorkflow() {
        System.out.println("--- Demo 2: Convert + If Workflow ---");
        Workflow<Object, Object> workflow = new Workflow<>();

        WorkflowNode node1 = WorkflowNode.createConvertNode("n1", "toLowerCase",
                s -> ((String) s).toLowerCase());
        WorkflowNode nodeIf = WorkflowNode.createIfNode("nIf", "checkLength",
                s -> ((String) s).length() > 3);
        WorkflowNode nodePath1 = WorkflowNode.createConvertNode("nPath1", "appendStar",
                s -> s + "***");
        WorkflowNode nodePath2 = WorkflowNode.createConvertNode("nPath2", "appendDash",
                s -> s + "---");

        workflow.addNode(node1).addNode(nodeIf).addNode(nodePath1).addNode(nodePath2)
                .addEdge(new WorkflowEdge("e1", "n1", "nIf", "success"))
                .addEdge(new WorkflowEdge("e2", "nIf", "nPath1", "true"))
                .addEdge(new WorkflowEdge("e3", "nIf", "nPath2", "false"));

        System.out.println("--- Test 1: Long string ---");
        ExecutionResult<Object> result1 = new FlowEngine<>(workflow).execute("HELLO WORLD");
        System.out.println("Input: HELLO WORLD -> Output: " + result1.output());

        System.out.println("--- Test 2: Short string ---");
        ExecutionResult<Object> result2 = new FlowEngine<>(workflow).execute("HI");
        System.out.println("Input: HI -> Output: " + result2.output());
        System.out.println();
    }

    static void demoWhileLoop() {
        System.out.println("--- Demo: While Loop (Countdown) ---");
        // 狀態：當前剩餘次數
        Workflow<Object, Object> workflow = new Workflow<>();

        // 1. 判斷條件：> 0?
        workflow.addNode(WorkflowNode.createIfNode("check", "val > 0?", i -> (Integer) i > 0));

        // 2. 循環體：印出並減 1
        workflow.addNode(WorkflowNode.createConvertNode("body", "decrement", i -> {
            System.out.print(i + " ");
            return (Integer) i - 1;
        }));

        // 3. 結束節點
        workflow.addNode(WorkflowNode.createConvertNode("done", "finalize", i -> "Blast off!"));

        // 連接：環狀結構
        workflow.addEdge(new WorkflowEdge("e1", "check", "body", "true"))
                .addEdge(new WorkflowEdge("e2", "body", "check", "success")) // 回跳
                .addEdge(new WorkflowEdge("e3", "check", "done", "false"));

        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute(5);
        System.out.println("\nResult: " + result.output());
        System.out.println();
    }

    static void demoForLoopFixedCount() {
        System.out.println("--- Demo: For Loop (Fixed 3 iterations) ---");
        // 狀態：{ i: 0, limit: 3, acc: "" }
        record ForState(int i, int limit, String acc) {
        }

        Workflow<Object, Object> workflow = new Workflow<>();

        workflow.addNode(
                WorkflowNode.createConvertNode("init", "init(i=0)", input -> new ForState(0, (Integer) input, "")))
                .addNode(WorkflowNode.createIfNode("check", "i < limit?",
                        s -> ((ForState) s).i() < ((ForState) s).limit()))
                .addNode(WorkflowNode.createConvertNode("body", "appendStep", s -> {
                    ForState fs = (ForState) s;
                    return new ForState(fs.i() + 1, fs.limit(), fs.acc() + "[" + fs.i() + "]");
                }))
                .addNode(WorkflowNode.createConvertNode("done", "getResult", s -> ((ForState) s).acc()));

        workflow.addEdge(new WorkflowEdge("e1", "init", "check", "success"))
                .addEdge(new WorkflowEdge("e2", "check", "body", "true"))
                .addEdge(new WorkflowEdge("e3", "body", "check", "success")) // 回跳
                .addEdge(new WorkflowEdge("e4", "check", "done", "false"));

        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute(3);
        System.out.println("Output: " + result.output());
        System.out.println();
    }

    static void demoForEachCollection() {
        System.out.println("--- Demo: For Each (Collection Processing) ---");
        // 狀態：{ items: List, index: 0, result: List }
        record ForEachState(List<String> items, int index, List<String> processed) {
        }

        Workflow<Object, Object> workflow = new Workflow<>();

        workflow.addNode(WorkflowNode.createConvertNode("init", "prepare",
                input -> new ForEachState((List<String>) input, 0, new ArrayList<>())))
                .addNode(WorkflowNode.createIfNode("check", "hasMore?", s -> {
                    ForEachState fs = (ForEachState) s;
                    return fs.index() < fs.items().size();
                }));

        // 模擬一個負責「單個元素變換」的節點 (可以是子工作流)
        workflow.addNode(WorkflowNode.createConvertNode("processItem", "toUpper", s -> {
            ForEachState fs = (ForEachState) s;
            String item = fs.items().get(fs.index());
            fs.processed().add(item.toUpperCase()); // 變換
            return new ForEachState(fs.items(), fs.index() + 1, fs.processed()); // 推進索引
        }));

        workflow.addNode(WorkflowNode.createConvertNode("done", "finalList", s -> ((ForEachState) s).processed()));

        workflow.addEdge(new WorkflowEdge("e1", "init", "check", "success"))
                .addEdge(new WorkflowEdge("e2", "check", "processItem", "true"))
                .addEdge(new WorkflowEdge("e3", "processItem", "check", "success")) // 回跳
                .addEdge(new WorkflowEdge("e4", "check", "done", "false"));

        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute(Arrays.asList("apple", "banana", "cherry"));
        System.out.println("Input: [apple, banana, cherry]");
        System.out.println("Output: " + result.output());
        System.out.println();
    }

    static void demoCaseWhenBranching() {
        System.out.println("--- Demo: Case When (Multi-Signal Branching) ---");

        Workflow<Object, Object> workflow = new Workflow<>();

        // Switch 節點：根據輸入字串長度分類
        workflow.addNode(WorkflowNode.createCustomNode("switch", "categorizeLength", arg -> {
            String s = (String) arg.input();
            if (s.length() < 3)
                return new NodeOutput<>("short", s);
            if (s.length() < 6)
                return new NodeOutput<>("medium", s);
            return new NodeOutput<>("long", s);
        }));

        workflow.addNode(WorkflowNode.createConvertNode("hShort", "handleShort", s -> "SHORT: " + s))
                .addNode(WorkflowNode.createConvertNode("hMed", "handleMedium", s -> "MEDIUM: " + s))
                .addNode(WorkflowNode.createConvertNode("hLong", "handleLong", s -> "LONG: " + s));

        workflow.addEdge(new WorkflowEdge("e1", "switch", "hShort", "short"))
                .addEdge(new WorkflowEdge("e2", "switch", "hMed", "medium"))
                .addEdge(new WorkflowEdge("e3", "switch", "hLong", "long"));

        for (String val : new String[] { "hi", "hello", "extraordinarily" }) {
            System.out.println("Input: '" + val + "' -> Output: " + new FlowEngine<>(workflow).execute(val).output());
        }
        System.out.println();
    }
}

// ========== 核心數據結構 ==========

/** 工作流邊 - 連接兩個節點 */
record WorkflowEdge(String id, String fromNodeId, String toNodeId, String signal) {
}

/** 工作流節點執行結果 */
record NodeOutput<O>(String signal, O output) {
}

/** 節點輸入參數 */
record NodeArg<I>(I input) {
}

/** 工作流節點類型 */
enum NodeType {
    CONVERT, IF, SUB_WORKFLOW, CUSTOM
}

/**
 * 工作流節點 - 支持多種類型
 */
class WorkflowNode {
    private final String id;
    private final String name;
    public final NodeType type;
    private final Node<Object, Object> executor;
    public final Workflow<?, ?> subWorkflow;

    private WorkflowNode(String id, String name, NodeType type, Node<Object, Object> executor,
            Workflow<?, ?> subWorkflow) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.executor = executor;
        this.subWorkflow = subWorkflow;
    }

    static WorkflowNode createConvertNode(String id, String name, Function<Object, Object> converter) {
        return new WorkflowNode(id, name, NodeType.CONVERT,
                arg -> new NodeOutput<>("success", converter.apply(arg.input())), null);
    }

    static WorkflowNode createIfNode(String id, String name, Predicate<Object> condition) {
        return new WorkflowNode(id, name, NodeType.IF,
                arg -> new NodeOutput<>(condition.test(arg.input()) ? "true" : "false", arg.input()), null);
    }

    static WorkflowNode createSubWorkflowNode(String id, String name, Workflow<?, ?> subWorkflow) {
        return new WorkflowNode(id, name, NodeType.SUB_WORKFLOW, null, subWorkflow);
    }

    static WorkflowNode createCustomNode(String id, String name, Node<Object, Object> executor) {
        return new WorkflowNode(id, name, NodeType.CUSTOM, executor, null);
    }

    public String getId() {
        return id;
    }

    public Node<Object, Object> getExecutor() {
        return executor;
    }
}

/**
 * 函數式節點介面 - 支援泛型
 */
interface Node<I, O> {
    NodeOutput<O> execute(NodeArg<I> arg);
}

/**
 * 工作流定義 - 支援泛型
 */
class Workflow<I, O> {
    private final Map<String, WorkflowNode> nodes = new LinkedHashMap<>();
    private final List<WorkflowEdge> edges = new ArrayList<>();
    private String startNodeId;

    Workflow<I, O> addNode(WorkflowNode node) {
        nodes.put(node.getId(), node);
        if (startNodeId == null)
            startNodeId = node.getId();
        return this;
    }

    Workflow<I, O> addEdge(WorkflowEdge edge) {
        edges.add(edge);
        return this;
    }

    public Map<String, WorkflowNode> getNodes() {
        return nodes;
    }

    public List<WorkflowEdge> getEdges() {
        return edges;
    }

    public String getStartNodeId() {
        return startNodeId;
    }
}

/**
 * 工作流執行結果
 */
record ExecutionResult<O>(O output, String signal, List<String> executionPath) {
}

/**
 * 工作流執行引擎 - 支援泛型
 */
class FlowEngine<I, O> {
    private final Workflow<I, O> workflow;

    FlowEngine(Workflow<I, O> workflow) {
        this.workflow = workflow;
    }

    ExecutionResult<O> execute(I input) {
        List<String> executionPath = new ArrayList<>();
        Object currentData = input;
        String currentSignal = "";
        String currentNodeId = workflow.getStartNodeId();

        while (currentNodeId != null) {
            executionPath.add(currentNodeId);
            WorkflowNode node = workflow.getNodes().get(currentNodeId);
            if (node == null)
                break;

            NodeOutput<?> nodeOutput;
            if (node.type == NodeType.SUB_WORKFLOW && node.subWorkflow != null) {
                @SuppressWarnings("unchecked")
                ExecutionResult<Object> subResult = (ExecutionResult<Object>) new FlowEngine<Object, Object>(
                        (Workflow<Object, Object>) node.subWorkflow).execute(currentData);
                nodeOutput = new NodeOutput<>(subResult.signal(), subResult.output());
            } else {
                nodeOutput = node.getExecutor().execute(new NodeArg<>(currentData));
            }

            currentData = nodeOutput.output();
            currentSignal = nodeOutput.signal();
            currentNodeId = findNextNode(currentNodeId, nodeOutput.signal());
        }

        @SuppressWarnings("unchecked")
        O finalOutput = (O) currentData;
        return new ExecutionResult<>(finalOutput, currentSignal, executionPath);
    }

    private String findNextNode(String currentNodeId, String signal) {
        for (WorkflowEdge e : workflow.getEdges()) {
            if (e.fromNodeId().equals(currentNodeId) && e.signal().equals(signal))
                return e.toNodeId();
        }
        return null;
    }
}
