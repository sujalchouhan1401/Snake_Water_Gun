#include<stdio.h>
#include<stdlib.h>
#include<time.h>

int main(){
    srand(time(0));
    int player, computer = rand() % 3;

    printf("Choose 0 for snake, 1 for water and 2 for gun: ");
    scanf("%d",&player);
    printf("Computer chose %d\n",computer);

    if(player == 0  && computer == 0){
        printf("Its a Draw!!\n");
    }

    else if(player == 0 && computer == 1){
        printf("You Win!!\n");
    }

    else if(player == 0 && computer ==2){
        printf("You Lose!!\n");
    }

    else if(player == 1 && computer == 0){
        printf("You Lose!!\n");
    }

    else if(player == 1 && computer ==1){
        printf("Its a Draw!!\n");
    }

    else if(player == 1 && computer == 2){
        printf("You Win!!\n");
    }

    else if(player == 2 && computer == 0){
        printf("You Win!!\n");
    }

    else if(player == 2 && computer ==1){
        printf("You Lose!!\n");
    }

    else if(player == 2 && computer == 2){
        printf("Its a Draw!!\n");
    }

    else{
        printf("Something Went Wrong!");
    }

    return 0;
}
