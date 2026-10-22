import { Controller, Get, Query } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) {}

    @Get('searchPosts')
    async SearchPosts(@Query('term') term: string) {
        await this.postsService.openSearch(term);
        return { ok: true, term}
    }
}
