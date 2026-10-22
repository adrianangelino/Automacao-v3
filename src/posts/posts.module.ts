import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { BrowserModule } from '../browser/browser.module';
import { PostsController } from './posts.controller';

@Module({
  imports: [BrowserModule],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
