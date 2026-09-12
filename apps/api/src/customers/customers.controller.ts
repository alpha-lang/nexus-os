import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user);
  }

  @Get(':id/full')
  findFull(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findFull(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.service.create(body, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.service.update(id, body, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }

  // ==========================================
  // TAGS
  // ==========================================
  @Post(':id/tags')
  addTag(@Param('id') id: string, @Body() body: { tag: string }, @CurrentUser() user: any) {
    return this.service.addTag(id, body.tag, user);
  }

  @Delete(':id/tags/:tag')
  removeTag(@Param('id') id: string, @Param('tag') tag: string, @CurrentUser() user: any) {
    return this.service.removeTag(id, decodeURIComponent(tag), user);
  }

  // ==========================================
  // NOTES
  // ==========================================
  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() body: { content: string }, @CurrentUser() user: any) {
    return this.service.addNote(id, body.content, user);
  }

  @Delete(':id/notes/:noteId')
  deleteNote(@Param('id') id: string, @Param('noteId') noteId: string, @CurrentUser() user: any) {
    return this.service.deleteNote(id, noteId, user);
  }

  // ==========================================
  // DOCUMENTS
  // ==========================================
  @Post(':id/documents')
  addDocument(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.service.addDocument(id, body, user);
  }

  @Delete(':id/documents/:docId')
  deleteDocument(@Param('id') id: string, @Param('docId') docId: string, @CurrentUser() user: any) {
    return this.service.deleteDocument(id, docId, user);
  }
}
