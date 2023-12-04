import { IMessage, INode, INodeData, INodeParams, MessageType } from '../../../src/Interface'
import { convertBaseMessagetoIMessage, getBaseClasses } from '../../../src/utils'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'

class BufferMemory_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Buffer Memory'
        this.name = 'bufferMemory'
        this.version = 1.0
        this.type = 'BufferMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Remembers previous conversational back and forths directly'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.inputs = [
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history'
            },
            {
                label: 'Input Key',
                name: 'inputKey',
                type: 'string',
                default: 'input'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const memoryKey = nodeData.inputs?.memoryKey as string
        const inputKey = nodeData.inputs?.inputKey as string
        return new BufferMemoryExtended({
            returnMessages: true,
            memoryKey,
            inputKey
        })
    }
}

class BufferMemoryExtended extends BufferMemory {
    isShortTermMemory = true

    constructor(fields: BufferMemoryInput) {
        super(fields)
    }

    async getChatMessages(): Promise<IMessage[]> {
        const memoryResult = await this.loadMemoryVariables({})
        const baseMessages = memoryResult[this.memoryKey ?? 'chat_history']
        return convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[]): Promise<void> {
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        const inputValues = { [this.inputKey ?? 'input']: input?.text }
        const outputValues = { output: output?.text }

        await this.saveContext(inputValues, outputValues)
    }

    async clearChatMessages(): Promise<void> {
        await this.clear()
    }

    async resumeMessages(messages: IMessage[]): Promise<void> {
        // Clear existing chatHistory to avoid duplication
        if (messages.length) await this.clear()

        // Insert into chatHistory
        for (const msg of messages) {
            if (msg.type === 'userMessage') await this.chatHistory.addUserMessage(msg.message)
            else if (msg.type === 'apiMessage') await this.chatHistory.addAIChatMessage(msg.message)
        }
    }
}

module.exports = { nodeClass: BufferMemory_Memory }
