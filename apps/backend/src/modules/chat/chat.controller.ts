import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(@CurrentUser('sub') userId: string) {
    return this.chatService.getConversations(userId);
  }

  @Get('conversations/:matchId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation (cursor pagination)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination (message ID)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of messages to fetch', type: Number })
  async getMessages(
    @CurrentUser('sub') userId: string,
    @Param('matchId') matchId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return this.chatService.getMessages(userId, matchId, cursor, parsedLimit);
  }

  @Post('conversations/:matchId/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('matchId') matchId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, matchId, dto);
  }

  @Patch('conversations/:matchId/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.chatService.markAsRead(userId, matchId);
  }

  @Post('messages/:messageId/react')
  @ApiOperation({ summary: 'Add or toggle a reaction on a message' })
  async reactToMessage(
    @CurrentUser('sub') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: MessageReactionDto,
  ) {
    return this.chatService.reactToMessage(userId, messageId, dto);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete (unsend) a message — soft-delete, sender only' })
  async deleteMessage(
    @CurrentUser('sub') userId: string,
    @Param('messageId') messageId: string,
  ) {
    const result = await this.chatService.deleteMessage(userId, messageId);

    // Notify the conversation room in real-time so the other user sees the deletion
    this.chatGateway.broadcastToRoom(result.matchId, 'chat:message_deleted', {
      messageId: result.messageId,
      matchId: result.matchId,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });

    return result;
  }
}
