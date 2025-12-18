"""
腳本介面
"""
from abc import ABC, abstractmethod


class Script(ABC):
    """腳本抽象類別"""
    
    @abstractmethod
    def execute(self) -> None:
        """執行腳本"""
        pass

