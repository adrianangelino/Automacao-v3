import { Module } from '@nestjs/common';
import { BrowserModule } from '../browser/browser.module';
import { PostsModule } from '../posts/posts.module';
import { StoreModule } from '../store/store.module';
import { ControlController } from './control.controller';
import { AutoRunService } from './auto-run.service';
import { OutreachRunner } from './outreach-runner.service';

@Module({
  imports: [BrowserModule, PostsModule, StoreModule],
  providers: [OutreachRunner, AutoRunService],
  controllers: [ControlController],
  exports: [OutreachRunner, AutoRunService, StoreModule],
})
export class OutreachModule {}
