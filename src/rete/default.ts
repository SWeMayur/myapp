import { ClassicPreset as Classic, GetSchemes, NodeEditor } from 'rete';

import { Area2D, AreaExtensions, AreaPlugin } from 'rete-area-plugin';
import {
  ConnectionPlugin,
  Presets as ConnectionPresets,
} from 'rete-connection-plugin';
import {
  ReactPlugin,
  ReactArea2D,
  Presets as ReactPresets,
} from 'rete-react-plugin';
import { createRoot } from 'react-dom/client';

import { DataflowEngine, DataflowNode } from 'rete-engine';
import {
  AutoArrangePlugin,
  Presets as ArrangePresets,
} from 'rete-auto-arrange-plugin';

import {
  ContextMenuPlugin,
  ContextMenuExtra,
  Presets as ContextMenuPresets,
} from 'rete-context-menu-plugin';

const readJson = async () => {
  try {
    const response = await fetch("./assets/functionData.json");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const jsonData = await response.json();
    console.log("jsonData : ", jsonData);
    return jsonData;
  } catch (error) {
    console.error("Error fetching JSON data:", error);
    throw error; // Re-throw the error if needed
  }
  return "";
};

type Node = NumberNode | CubeNode | SquareNode | MultiplyNode;
type Conn =
  | Connection<NumberNode, MultiplyNode>
  | Connection<NumberNode, SquareNode>
  | Connection<NumberNode, CubeNode>
  | Connection<MultiplyNode, SquareNode>
  | Connection<MultiplyNode, CubeNode>
  | Connection<SquareNode, CubeNode>
type Schemes = GetSchemes<Node, Conn>;

class Connection<A extends Node, B extends Node> extends Classic.Connection<
  A,
  B
> {}

class NumberNode extends Classic.Node implements DataflowNode {
  width = 180;
  height = 120;
  
  constructor(initial: number, change?: (value: number) => void) {
    super('Number');

    this.addOutput('value', new Classic.Output(socket, 'Number'));
    this.addControl(
      'value',
      new Classic.InputControl('number', { initial, change })
    );
  }
  data() {
    const value = (this.controls['value'] as Classic.InputControl<'number'>)
      .value;

    return {
      value,
    };
  }
}

class CubeNode extends Classic.Node implements DataflowNode {
  width = 180;
  height = 195;

  constructor() {
    super('Cube');

    this.addInput('a', new Classic.Input(socket, 'A'));
    this.addOutput('value', new Classic.Output(socket, 'Number'));
    this.addControl(
      'result',
      new Classic.InputControl('number', { initial: 0, readonly: true })
    );
  }
  data(inputs: { a?: number[]; }) {
    const { a = [] } = inputs;
    const sum = (a[0] || 0) * (a[0] || 0) * (a[0] || 0);

    (this.controls['result'] as Classic.InputControl<'number'>).setValue(sum);

    return {
      value: sum,
    };
  }
}


class MultiplyNode extends Classic.Node implements DataflowNode {
  width = 180;
  height = 195;

  constructor() {
    super('Multiply');

    this.addInput('a', new Classic.Input(socket, 'X'));
    this.addInput('b', new Classic.Input(socket, 'Y'));
    this.addOutput('value', new Classic.Output(socket, 'Number'));
    this.addControl(
      'result',
      new Classic.InputControl('number', { initial: 1, readonly: true })
    );
  }
  data(inputs: { a?: number[]; b?: number[] }) {
    const { a = [], b = []} = inputs;
    const sum = (a[0] || 0) * (b[0] || 0);

    (this.controls['result'] as Classic.InputControl<'number'>).setValue(sum);

    return {
      value: sum,
    };
  }
}

class SquareNode extends Classic.Node implements DataflowNode {
  width = 180;
  height = 195;

  constructor() {
    super('Square');

    this.addInput('a', new Classic.Input(socket, 'X'));
    this.addOutput('value', new Classic.Output(socket, 'Number'));
    this.addControl(
      'result',
      new Classic.InputControl('number', { initial: 1, readonly: true })
    );
  }
  data(inputs: { a?: number[] }) {
    const { a = []} = inputs;
    const sum = (a[0] || 0) * (a[0] || 0);

    (this.controls['result'] as Classic.InputControl<'number'>).setValue(sum);

    return {
      value: sum,
    };
  }
}


type AreaExtra = Area2D<Schemes> | ReactArea2D<Schemes> | ContextMenuExtra;

const socket = new Classic.Socket('socket');

export async function createEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const reactRender = new ReactPlugin<Schemes, AreaExtra>({ createRoot });

  const contextMenu = new ContextMenuPlugin<Schemes>({
    items: ContextMenuPresets.classic.setup([
      ['Number', () => new NumberNode(1, process)],
      ['Multiply', () => new MultiplyNode()],
      ['Square', () => new SquareNode()],
      ['Cube', () => new CubeNode()]
    ]),
  });

  editor.use(area);

  area.use(reactRender);

  area.use(connection);
  area.use(contextMenu);

  connection.addPreset(ConnectionPresets.classic.setup());
  reactRender.addPreset(ReactPresets.classic.setup());
  reactRender.addPreset(ReactPresets.contextMenu.setup());

  const dataflow = new DataflowEngine<Schemes>();

  editor.use(dataflow);

  const numberNode1 = new NumberNode(1, process);
  const numberNode2 = new NumberNode(1, process);
  const multiplyNode = new MultiplyNode();
  const squareNode  = new SquareNode();
  const cubeNode  = new CubeNode();


  readJson();

  await editor.addNode(numberNode1);
  await editor.addNode(numberNode2);
  await editor.addNode(multiplyNode)
  await editor.addNode(squareNode)
  await editor.addNode(cubeNode);

  await editor.addConnection(new Connection(numberNode1, 'value', multiplyNode, 'a'));
  await editor.addConnection(new Connection(numberNode2, 'value', multiplyNode, 'b'));
  await editor.addConnection(new Connection(multiplyNode, 'value', squareNode, 'a'));
  await editor.addConnection(new Connection(squareNode, 'value', cubeNode, 'a'));



  const arrange = new AutoArrangePlugin<Schemes>();

  arrange.addPreset(ArrangePresets.classic.setup());

  area.use(arrange);

  await arrange.layout();

  AreaExtensions.zoomAt(area, editor.getNodes());

  AreaExtensions.simpleNodesOrder(area);

  const selector = AreaExtensions.selector();
  const accumulating = AreaExtensions.accumulateOnCtrl();

  AreaExtensions.selectableNodes(area, selector, { accumulating });

  async function process() {
    dataflow.reset();

    editor
  .getNodes()
  .filter((node) => node instanceof CubeNode || node instanceof MultiplyNode || node instanceof SquareNode || node instanceof CubeNode)
  .forEach(async (node) => {
    const resultControl = node.controls['result'];
    if (resultControl && resultControl instanceof Classic.InputControl) {
      const sum = await dataflow.fetch(node.id);
      console.log(node.id, 'produces', sum);
      area.update('control', resultControl.id);
    } else {
      console.warn(`Control 'result' not found or not an InputControl for node ${node.id}`);
    }
  });

  }

  editor.addPipe((context) => {
    if (
      context.type === 'connectioncreated' ||
      context.type === 'connectionremoved'
    ) {
      process();
    }
    return context;
  });

  process();

  return {
    destroy: () => area.destroy(),
  };
}
