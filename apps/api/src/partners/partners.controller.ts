import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from '../customers/customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('partners')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PartnersController {
  constructor(private readonly service: CustomersService) {}

  // ─── CRUD principal ───
  @Get()
  findAll(@CurrentUser() u: any, @Query() q: any) {
    return this.service.findAllPartners(u, q);
  }

  @Post()
  create(@CurrentUser() u: any, @Body() b: any) {
    return this.service.createPartner(u, b);
  }

  @Get(':id/full')
  findFull(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.findFullPartner(u, id);
  }

  @Get(':id')
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.findOnePartner(u, id);
  }

  @Patch(':id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.service.update(id, b, u);
  }

  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.remove(id, u);
  }

  // ─── TAGS ───
  @Post(':id/tags')
  addTag(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { tag: string }) {
    return this.service.addTag(id, b.tag, u);
  }

  @Delete(':id/tags/:tag')
  removeTag(@CurrentUser() u: any, @Param('id') id: string, @Param('tag') tag: string) {
    return this.service.removeTag(id, decodeURIComponent(tag), u);
  }

  // ─── NOTES ───
  @Post(':id/notes')
  addNote(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { content: string }) {
    return this.service.addNote(id, b.content, u);
  }

  @Delete(':id/notes/:noteId')
  deleteNote(@CurrentUser() u: any, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.service.deleteNote(id, noteId, u);
  }

  // ─── DOCUMENTS ───
  @Post(':id/documents')
  addDocument(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.service.addDocument(id, b, u);
  }

  @Delete(':id/documents/:docId')
  deleteDocument(@CurrentUser() u: any, @Param('id') id: string, @Param('docId') docId: string) {
    return this.service.deleteDocument(id, docId, u);
  }
}
