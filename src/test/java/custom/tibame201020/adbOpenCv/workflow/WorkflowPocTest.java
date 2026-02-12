package custom.tibame201020.adbOpenCv.workflow;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class WorkflowPocTest {

    @Test
    @DisplayName("Test 1: Simple Convert Workflow - 驗證基礎轉換邏輯")
    void testSimpleConvert() {
        Workflow<Object, Object> workflow = new Workflow<>();
        workflow.addNode(WorkflowNode.createConvertNode("n1", "toUpperCase", s -> ((String) s).toUpperCase()))
                .addNode(WorkflowNode.createConvertNode("n2", "appendHash", s -> s + "#"))
                .addEdge(new WorkflowEdge("e1", "n1", "n2", "success"));

        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute("hello");
        assertThat(result.output()).isEqualTo("HELLO#");
    }

    @Test
    @DisplayName("Test 2: While Loop - 驗證環狀結構與計數器倒數")
    void testWhileLoop() {
        Workflow<Object, Object> workflow = new Workflow<>();
        workflow.addNode(WorkflowNode.createIfNode("check", "val > 0?", i -> (Integer) i > 0))
                .addNode(WorkflowNode.createConvertNode("body", "decrement", i -> (Integer) i - 1))
                .addNode(WorkflowNode.createConvertNode("done", "finalize", i -> "Blast off!"))
                .addEdge(new WorkflowEdge("e1", "check", "body", "true"))
                .addEdge(new WorkflowEdge("e2", "body", "check", "success"))
                .addEdge(new WorkflowEdge("e3", "check", "done", "false"));

        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute(3);
        assertThat(result.output()).isEqualTo("Blast off!");
        assertThat(result.executionPath()).containsExactly("check", "body", "check", "body", "check", "body", "check",
                "done");
    }

    @Test
    @DisplayName("Test 3: For Loop (Fixed Count) - 驗證固定次數循環")
    void testForLoop() {
        record ForState(int i, int limit, String acc) {
        }
        Workflow<Object, Object> workflow = new Workflow<>();
        workflow.addNode(WorkflowNode.createConvertNode("init", "init", input -> new ForState(0, (Integer) input, "")))
                .addNode(WorkflowNode.createIfNode("check", "i < limit?",
                        s -> ((ForState) s).i() < ((ForState) s).limit()))
                .addNode(WorkflowNode.createConvertNode("body", "append", s -> {
                    ForState fs = (ForState) s;
                    return new ForState(fs.i() + 1, fs.limit(), fs.acc() + fs.i());
                }))
                .addNode(WorkflowNode.createConvertNode("done", "finalize", s -> ((ForState) s).acc()))
                .addEdge(new WorkflowEdge("e1", "init", "check", "success"))
                .addEdge(new WorkflowEdge("e2", "check", "body", "true"))
                .addEdge(new WorkflowEdge("e3", "body", "check", "success"))
                .addEdge(new WorkflowEdge("e4", "check", "done", "false"));

        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute(3);
        assertThat(result.output()).isEqualTo("012");
    }

    @Test
    @DisplayName("Test 4: For Each Collection - 驗證集合批次處理")
    void testForEach() {
        record ForEachState(List<String> items, int index, List<String> processed) {
        }
        Workflow<Object, Object> workflow = new Workflow<>();

        @SuppressWarnings("unchecked")
        WorkflowNode initNode = WorkflowNode.createConvertNode("init", "init",
                input -> new ForEachState((List<String>) input, 0, new ArrayList<>()));

        workflow.addNode(initNode)
                .addNode(WorkflowNode.createIfNode("check", "hasMore?",
                        s -> ((ForEachState) s).index() < ((ForEachState) s).items().size()))
                .addNode(WorkflowNode.createConvertNode("process", "upper", s -> {
                    ForEachState fs = (ForEachState) s;
                    fs.processed().add(fs.items().get(fs.index()).toUpperCase());
                    return new ForEachState(fs.items(), fs.index() + 1, fs.processed());
                }))
                .addNode(WorkflowNode.createConvertNode("done", "finalize", s -> ((ForEachState) s).processed()))
                .addEdge(new WorkflowEdge("e1", "init", "check", "success"))
                .addEdge(new WorkflowEdge("e2", "check", "process", "true"))
                .addEdge(new WorkflowEdge("e3", "process", "check", "success"))
                .addEdge(new WorkflowEdge("e4", "check", "done", "false"));

        ExecutionResult<Object> result = new FlowEngine<>(workflow).execute(Arrays.asList("a", "b"));

        @SuppressWarnings("unchecked")
        List<String> output = (List<String>) result.output();
        assertThat(output).containsExactly("A", "B");
    }

    @Test
    @DisplayName("Test 5: Case When (Switch) - 驗證多信號邊界跳轉")
    void testCaseWhen() {
        Workflow<Object, Object> workflow = new Workflow<>();
        workflow.addNode(WorkflowNode.createCustomNode("switch", "modulo2", arg -> {
            int val = (Integer) arg.input();
            return new NodeOutput<>(val % 2 == 0 ? "even" : "odd", val);
        }))
                .addNode(WorkflowNode.createConvertNode("hEven", "evenRes", v -> "EVEN"))
                .addNode(WorkflowNode.createConvertNode("hOdd", "oddRes", v -> "ODD"))
                .addEdge(new WorkflowEdge("e1", "switch", "hEven", "even"))
                .addEdge(new WorkflowEdge("e2", "switch", "hOdd", "odd"));

        assertThat(new FlowEngine<>(workflow).execute(2).output()).isEqualTo("EVEN");
        assertThat(new FlowEngine<>(workflow).execute(3).output()).isEqualTo("ODD");
    }
}
